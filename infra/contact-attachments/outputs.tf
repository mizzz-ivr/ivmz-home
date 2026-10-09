output "bucket_name" {
  value = aws_s3_bucket.attachments.id
}

output "app_iam_user" {
  description = "Create an access key for this user manually and store it only in Netlify."
  value       = aws_iam_user.app.name
}

output "guardduty_malware_protection_plan_id" {
  value = aws_guardduty_malware_protection_plan.attachments.id
}
