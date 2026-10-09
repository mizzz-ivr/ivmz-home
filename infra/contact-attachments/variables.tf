variable "region" {
  description = "Region for the bucket and the GuardDuty Malware Protection plan."
  type        = string
  default     = "ap-northeast-1"
}

variable "bucket_name" {
  description = "Globally unique name for the private attachments bucket."
  type        = string
}

variable "allowed_origins" {
  description = "Origins allowed to POST uploads (production, plus preview if you test uploads there)."
  type        = list(string)
  default     = ["https://ivmz.ivrm.jp"]
}

variable "clean_retention_days" {
  description = "How long verified attachments are kept before S3 expires them."
  type        = number
  default     = 90
}
