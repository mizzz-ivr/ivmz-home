# Contact form attachments: private quarantine/clean bucket + AWS GuardDuty Malware Protection for S3.
#
# NOT applied by CI. Review, then `terraform plan` / `apply` with credentials of the ivmz AWS account.
# See docs/contact-attachments.md for the architecture and the application-side variables.

terraform {
  required_version = ">= 1.6"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.60"
    }
  }
}

provider "aws" {
  region = var.region
}

data "aws_caller_identity" "current" {}

locals {
  quarantine_prefix = "quarantine/"
  clean_prefix      = "clean/"
}

# --- Bucket (private, encrypted, TLS only) ----------------------------------------------------

resource "aws_s3_bucket" "attachments" {
  bucket = var.bucket_name
}

resource "aws_s3_bucket_public_access_block" "attachments" {
  bucket                  = aws_s3_bucket.attachments.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_ownership_controls" "attachments" {
  bucket = aws_s3_bucket.attachments.id
  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "attachments" {
  bucket = aws_s3_bucket.attachments.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

data "aws_iam_policy_document" "tls_only" {
  statement {
    sid       = "DenyInsecureTransport"
    effect    = "Deny"
    actions   = ["s3:*"]
    resources = [aws_s3_bucket.attachments.arn, "${aws_s3_bucket.attachments.arn}/*"]
    principals {
      type        = "*"
      identifiers = ["*"]
    }
    condition {
      test     = "Bool"
      variable = "aws:SecureTransport"
      values   = ["false"]
    }
  }
}

resource "aws_s3_bucket_policy" "attachments" {
  bucket = aws_s3_bucket.attachments.id
  policy = data.aws_iam_policy_document.tls_only.json
}

# Browsers upload straight to the quarantine prefix with a presigned POST.
resource "aws_s3_bucket_cors_configuration" "attachments" {
  bucket = aws_s3_bucket.attachments.id
  cors_rule {
    allowed_methods = ["POST"]
    allowed_origins = var.allowed_origins
    allowed_headers = ["*"]
    max_age_seconds = 3000
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "attachments" {
  bucket = aws_s3_bucket.attachments.id

  rule {
    id     = "expire-quarantine"
    status = "Enabled"
    filter { prefix = local.quarantine_prefix }
    expiration { days = 1 }
    abort_incomplete_multipart_upload { days_after_initiation = 1 }
  }

  rule {
    id     = "expire-clean"
    status = "Enabled"
    filter { prefix = local.clean_prefix }
    expiration { days = var.clean_retention_days }
  }
}

# --- GuardDuty Malware Protection for S3 (scans only the quarantine prefix) ---------------------

data "aws_iam_policy_document" "guardduty_trust" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["malware-protection-plan.guardduty.amazonaws.com"]
    }
    condition {
      test     = "StringEquals"
      variable = "aws:SourceAccount"
      values   = [data.aws_caller_identity.current.account_id]
    }
  }
}

data "aws_iam_policy_document" "guardduty_access" {
  statement {
    sid       = "AllowManagedRuleToSendS3EventsToGuardDuty"
    actions   = ["events:PutRule", "events:DeleteRule", "events:PutTargets", "events:RemoveTargets"]
    resources = ["arn:aws:events:${var.region}:${data.aws_caller_identity.current.account_id}:rule/DO-NOT-DELETE-AmazonGuardDutyMalwareProtectionS3*"]
    condition {
      test     = "StringLike"
      variable = "events:ManagedBy"
      values   = ["malware-protection-plan.guardduty.amazonaws.com"]
    }
  }
  statement {
    sid       = "AllowGuardDutyToMonitorEventBridgeManagedRule"
    actions   = ["events:DescribeRule", "events:ListTargetsByRule"]
    resources = ["arn:aws:events:${var.region}:${data.aws_caller_identity.current.account_id}:rule/DO-NOT-DELETE-AmazonGuardDutyMalwareProtectionS3*"]
  }
  statement {
    sid       = "AllowPostScanTag"
    actions   = ["s3:PutObjectTagging", "s3:GetObjectTagging", "s3:PutObjectVersionTagging", "s3:GetObjectVersionTagging"]
    resources = ["${aws_s3_bucket.attachments.arn}/${local.quarantine_prefix}*"]
  }
  statement {
    sid       = "AllowEnableS3EventBridgeEvents"
    actions   = ["s3:PutBucketNotification", "s3:GetBucketNotification"]
    resources = [aws_s3_bucket.attachments.arn]
  }
  statement {
    sid       = "AllowPutValidationObject"
    actions   = ["s3:PutObject"]
    resources = ["${aws_s3_bucket.attachments.arn}/malware-protection-resource-validation-object"]
  }
  statement {
    sid       = "AllowCheckBucketOwnership"
    actions   = ["s3:ListBucket"]
    resources = [aws_s3_bucket.attachments.arn]
  }
  statement {
    sid       = "AllowMalwareScan"
    actions   = ["s3:GetObject", "s3:GetObjectVersion"]
    resources = ["${aws_s3_bucket.attachments.arn}/${local.quarantine_prefix}*"]
  }
}

resource "aws_iam_role" "guardduty" {
  name               = var.guardduty_role_name
  assume_role_policy = data.aws_iam_policy_document.guardduty_trust.json
}

resource "aws_iam_role_policy" "guardduty" {
  role   = aws_iam_role.guardduty.id
  policy = data.aws_iam_policy_document.guardduty_access.json
}

resource "aws_guardduty_malware_protection_plan" "attachments" {
  role = aws_iam_role.guardduty.arn

  protected_resource {
    s3_bucket {
      bucket_name     = aws_s3_bucket.attachments.id
      object_prefixes = [local.quarantine_prefix]
    }
  }

  actions {
    tagging {
      status = "ENABLED"
    }
  }

  depends_on = [aws_iam_role_policy.guardduty]
}

# --- Application identity (least privilege) --------------------------------------------------

data "aws_iam_policy_document" "app" {
  statement {
    sid       = "PresignQuarantineUploads"
    actions   = ["s3:PutObject"]
    resources = ["${aws_s3_bucket.attachments.arn}/${local.quarantine_prefix}*"]
  }
  statement {
    sid       = "ReadScanResultAndContent"
    actions   = ["s3:GetObject", "s3:GetObjectTagging", "s3:DeleteObject"]
    resources = ["${aws_s3_bucket.attachments.arn}/${local.quarantine_prefix}*"]
  }
  statement {
    sid       = "ManageCleanObjects"
    actions   = ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"]
    resources = ["${aws_s3_bucket.attachments.arn}/${local.clean_prefix}*"]
  }
}

resource "aws_iam_user" "app" {
  name = "${var.bucket_name}-app"
}

resource "aws_iam_user_policy" "app" {
  user   = aws_iam_user.app.name
  policy = data.aws_iam_policy_document.app.json
}

# Create the access key out-of-band (console/CLI) and store it ONLY in the Netlify environment:
#   CONTACT_ATTACH_BUCKET / CONTACT_ATTACH_REGION / CONTACT_ATTACH_ACCESS_KEY_ID / CONTACT_ATTACH_SECRET_ACCESS_KEY
# Terraform deliberately does not create the key so the secret never lands in state.
