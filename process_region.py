import os
import io
import time
import base64
import boto3
from PIL import Image
from datetime import datetime
import pytz
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
subdirectory = f"saved_copilot_regions-{current_time.strftime('%Y%m%d-%H%M%S')}"

def save_screenshot(base64_image):
    try:
        # Decode base64 image
        image_data = base64.b64decode(base64_image.split(',')[1])
        image = Image.open(io.BytesIO(image_data))
        
        # Convert image to bytes
        img_byte_arr = io.BytesIO()
        image.save(img_byte_arr, format='JPEG')
        img_byte_arr = img_byte_arr.getvalue()

        # Generate filename with timestamp
        timestamp = time.strftime("%Y%m%d-%H%M%S")
        filename = f"{subdirectory}/screenshot_{timestamp}.jpg"
        
        # Upload to S3
        s3_client.put_object(
            Bucket=os.getenv('S3_BUCKET'),
            Key=filename,
            Body=img_byte_arr,
            ContentType='image/jpeg'
        )
        
        # Generate S3 URL
        s3_url = f"https://{os.getenv('S3_BUCKET')}.s3.{os.getenv('AWS_REGION')}.amazonaws.com/{filename}"
        
        print(f"Screenshot uploaded to S3: {s3_url}")
        return {"success": True, "filename": filename, "url": s3_url}
    
    except Exception as e:
        print(f"Error uploading screenshot to S3: {str(e)}")
        return {"success": False, "error": str(e)}