import os
import base64
import time
from datetime import datetime
import pytz
import boto3
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure AWS credentials
s3_client = boto3.client(
    's3',
    aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
    aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
    region_name=os.getenv('AWS_REGION')
)

# Get current PST timestamp for directory name
pst = pytz.timezone('America/Los_Angeles')
current_time = datetime.now(pst)
subdirectory = f"saved_copilot_regions-{current_time.strftime('%Y%m%d-%H%M%S-%f')[:19]}"

def save_screenshot(base64_image):
    try:
        # Decode base64 image directly to bytes
        image_data = base64.b64decode(base64_image.split(',')[1])
        
        # Generate filename with timestamp including milliseconds
        timestamp = datetime.now().strftime("%Y%m%d-%H%M%S-%f")[:19]  # Get first 3 digits of microseconds
        filename = f"{subdirectory}/screenshot_{timestamp}.jpg"
        
        # Upload to S3
        s3_client.put_object(
            Bucket=os.getenv('S3_BUCKET'),
            Key=filename,
            Body=image_data,
            ContentType='image/jpeg'
        )
        
        # Generate S3 URL
        s3_url = f"https://{os.getenv('S3_BUCKET')}.s3.{os.getenv('AWS_REGION')}.amazonaws.com/{filename}"
        
        print(f"Screenshot uploaded to S3: {s3_url}")
        return {"success": True, "filename": filename, "url": s3_url}
    
    except Exception as e:
        print(f"Error uploading screenshot to S3: {str(e)}")
        return {"success": False, "error": str(e)}