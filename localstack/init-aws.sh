#!/bin/bash
# LocalStack initialization script
# This script runs automatically when LocalStack starts

echo "Initializing LocalStack S3..."

# Create the S3 bucket for BoilerMap images
awslocal s3 mb s3://boilermap-images

# Set bucket policy to allow public read access (for development)
awslocal s3api put-bucket-policy --bucket boilermap-images --policy '{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::boilermap-images/*"
    }
  ]
}'

echo "S3 bucket 'boilermap-images' created successfully!"

# List buckets to verify
echo "Available buckets:"
awslocal s3 ls
