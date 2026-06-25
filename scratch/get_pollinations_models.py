import requests

def get_models():
    try:
        r = requests.get("https://image.pollinations.ai/models", timeout=10)
        print(r.text)
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    get_models()
