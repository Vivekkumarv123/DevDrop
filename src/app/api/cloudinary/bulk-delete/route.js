import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

export async function DELETE(request) {
  try {
    const { public_ids } = await request.json();
    
    if (!public_ids || !Array.isArray(public_ids) || public_ids.length === 0) {
      return Response.json({ error: 'Invalid public_ids array' }, { status: 400 });
    }

    const results = [];
    const chunkSize = 100;
    
    for (let i = 0; i < public_ids.length; i += chunkSize) {
      const chunk = public_ids.slice(i, i + chunkSize);
      const result = await cloudinary.api.delete_resources(chunk);
      results.push(result);
    }

    return Response.json({ success: true, results });
  } catch (error) {
    console.error('Bulk delete error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}