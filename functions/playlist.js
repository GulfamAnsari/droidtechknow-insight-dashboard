export async function handler(event, context) {
  const listid = event.queryStringParameters.listid;
  
  if (!listid) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing 'listid'" })
    };
  }

  const url = `https://www.jiosaavn.com/api.php?__call=playlist.getDetails&_format=json&cc=in&_marker=0&api_version=4&listid=${encodeURIComponent(listid)}`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json'
      }
    });

    const text = await response.text();
    const jsonStart = text.indexOf('{');
    const cleanText = jsonStart !== -1 ? text.slice(jsonStart) : '{}';

    return {
      statusCode: 200,
      body: cleanText
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch playlist', details: error.message })
    };
  }
}
