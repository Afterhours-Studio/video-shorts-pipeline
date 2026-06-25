import requests
import time
from pathlib import Path

def test_pollinations():
    prompt = "A cinematic shot of a futuristic robot in a neon city, 9:16 aspect ratio"
    encoded = requests.utils.quote(prompt)
    url = f"https://image.pollinations.ai/prompt/{encoded}?width=768&height=1344&nologo=true&seed={int(time.time())}"
    
    print(f"Testing URL: {url}")
    try:
        response = requests.get(url, timeout=30)
        print(f"Status Code: {response.status_code}")
        print(f"Content Length: {len(response.content)} bytes")
        
        if response.status_code == 200 and len(response.content) > 10000:
            print("SUCCESS: Pollinations.ai is working without an API key.")
            # Save the image to verify
            Path("test_pollinations.png").write_bytes(response.content)
            print("Image saved as test_pollinations.png")
        else:
            print("FAILURE: Response was not as expected.")
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    test_pollinations()
