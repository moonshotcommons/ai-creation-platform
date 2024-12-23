import { NextResponse } from 'next/server';

// 生成图片
export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const response = await fetch('https://api.stability.ai/v2beta/stable-image/generate/core', {
      method: 'POST',
      headers: {
        'authorization': `Bearer ${process.env.STABILITY_API_KEY}`,
        'accept': 'image/*',
      },
      body: formData,
    });


    if (!response.ok) {
      const errorData = await response.json();
      console.log(errorData);
      console.log("1------------");
      const errorMessage = response.statusText || errorData.statusText || '发生未知错误，请稍后再试。';
      console.log(errorMessage);
      console.log("2------------");      
      throw new Error(`Stability API error: ${errorMessage}`);
    }

    const imageBlob = await response.blob();
    return new NextResponse(imageBlob, {
      headers: {
        'Content-Type': 'image/png'
      }
    });
  } catch (error: any) {
    console.error(error);
    return new Response(JSON.stringify({ error: error?.message || '未知错误' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}