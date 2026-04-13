#!/bin/bash

# Configuration
PROJECT_ID="carnatic-sangeetham"
REGION="asia-south1"
SERVICE_NAME="sangeetha-api"

echo "🚀 Starting deployment to Google Cloud Run ($REGION)..."

# 1. Ensure APIs are enabled
echo "📦 Enabling required APIs..."
gcloud services enable run.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com --project $PROJECT_ID

# 2. Build the image in the cloud
echo "🔨 Building image with Cloud Build..."
gcloud builds submit --tag gcr.io/$PROJECT_ID/$SERVICE_NAME --project $PROJECT_ID

# 3. Deploy to Cloud Run
echo "🚢 Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --image gcr.io/$PROJECT_ID/$SERVICE_NAME \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --project $PROJECT_ID \
  --set-env-vars="NODE_ENV=production,FIREBASE_SERVICE_ACCOUNT_PATH=./server/service-account.json"

echo "✅ Deployment complete!"
gcloud run services describe $SERVICE_NAME --region $REGION --format='value(status.url)' --project $PROJECT_ID
