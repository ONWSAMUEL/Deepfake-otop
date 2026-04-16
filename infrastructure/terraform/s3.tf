# ─── S3 bucket for media files ────────────────────────────────────────────────

resource "aws_s3_bucket" "media" {
  bucket = var.s3_bucket_name
}

resource "aws_s3_bucket_versioning" "media" {
  bucket = aws_s3_bucket.media.id
  versioning_configuration {
    status = "Suspended"
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "media" {
  bucket = aws_s3_bucket.media.id

  rule {
    id     = "expire-outputs"
    status = "Enabled"

    filter {
      prefix = "outputs/"
    }

    expiration {
      days = 30  # Auto-delete processed videos after 30 days
    }
  }

  rule {
    id     = "expire-uploads"
    status = "Enabled"

    filter {
      prefix = "uploads/"
    }

    expiration {
      days = 7  # Auto-delete raw uploads after 7 days
    }
  }
}

resource "aws_s3_bucket_cors_configuration" "media" {
  bucket = aws_s3_bucket.media.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST"]
    allowed_origins = ["*"]   # Restrict to your domain in production
    max_age_seconds = 3000
  }
}

# Block public access — serve via CloudFront only
resource "aws_s3_bucket_public_access_block" "media" {
  bucket                  = aws_s3_bucket.media.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# OAC — allow CloudFront to read from S3
resource "aws_cloudfront_origin_access_control" "media" {
  name                              = "${var.project_name}-media-oac"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_s3_bucket_policy" "media" {
  bucket = aws_s3_bucket.media.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid    = "AllowCloudFront"
      Effect = "Allow"
      Principal = {
        Service = "cloudfront.amazonaws.com"
      }
      Action   = "s3:GetObject"
      Resource = "${aws_s3_bucket.media.arn}/*"
      Condition = {
        StringEquals = {
          "AWS:SourceArn" = aws_cloudfront_distribution.media.arn
        }
      }
    }]
  })

  depends_on = [aws_s3_bucket_public_access_block.media]
}
