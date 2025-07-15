
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Only POST requests allowed' });
  }

  try {
    const {
      client_id,
      campaign_id,
      platform,
      headline,
      description,
      caption,
      file_url,
      file_name
    } = req.body;

    const adpilerApiKey = process.env.ADPILER_API_KEY;

    const payload = {
      client_id,
      campaign_id,
      platform,
      headline,
      description,
      caption,
      files: [
        {
          url: file_url,
          filename: file_name
        }
      ]
    };

    const response = await fetch("https://platform.adpiler.com/api/creatives", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${adpilerApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(500).json({ error: "AdPiler error", details: errorText });
    }

    const data = await response.json();
    return res.status(200).json({ message: "Uploaded successfully", adpilerResponse: data });

  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ message: "Internal Server Error", error: err.message });
  }
}
