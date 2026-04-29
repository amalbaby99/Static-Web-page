# Static-Web-page
Deploying a web page in github pages

## Live server feed

The page listens to the FastAPI server at:

```text
https://plasma-kindly-liqueur.ngrok-free.dev/api/events/stream
```

To update the page, post data to the server:

```bash
curl -X POST https://plasma-kindly-liqueur.ngrok-free.dev/api/events \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"update","data":{"message":"hello","value":123}}'
```

For live aircraft updates, send a `flights` array inside `data`:

```json
{
  "type": "update",
  "data": {
    "source": "FastAPI Live Feed",
    "message": "Live aircraft update",
    "location": {
      "postcode": "SW1A 1AA",
      "label": "London, United Kingdom",
      "lat": 51.501,
      "lon": -0.141
    },
    "flights": [
      {
        "callsign": "TEST123",
        "airline": "Test Airways",
        "lat": 51.72,
        "lon": -1.45,
        "altitude": 36000,
        "speed": 466,
        "heading": 287
      }
    ]
  }
}
```
