'use client';
import { useState } from 'react';
import Image from 'next/image';
import { Long, VisibilityType, RedundancyType, bytesFromBase64 } from '@bnb-chain/greenfield-js-sdk';
import { useAccount, useNetwork, useSwitchNetwork } from 'wagmi';
import { client, selectSp } from '@/client';
import { getOffchainAuthKeys } from '@/utils/offchainAuth';
import { ReedSolomon } from '@bnb-chain/reed-solomon';

const rs = new ReedSolomon();
const BUCKET_NAME = 'ai-socia-demo';

export default function Generate() {
  const { address, isConnected, connector } = useAccount();
  const { chain } = useNetwork();
  const { switchNetwork } = useSwitchNetwork();
  
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [uploadStatus, setUploadStatus] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const formData = new FormData();
      formData.append('prompt', prompt);
      formData.append('output_format', 'png');
      formData.append('style_preset', 'fantasy-art');

      const response = await fetch('/api/generate-image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '生成图片失败');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setImageUrl(url);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createBucket = async (address: string, provider: any) => {
    try {
      const spInfo = await selectSp();
      const offChainData = await getOffchainAuthKeys(address, provider);
      
      if (!offChainData) {
        throw new Error('离线认证失败');
      }

      const createBucketTx = await client.bucket.createBucket({
        bucketName: BUCKET_NAME,
        creator: address,
        primarySpAddress: spInfo.primarySpAddress,
        visibility: VisibilityType.VISIBILITY_TYPE_PUBLIC_READ,
        chargedReadQuota: Long.fromString('0'),
        paymentAddress: address,
      });

      const simulateInfo = await createBucketTx.simulate({
        denom: 'BNB',
      });

      const res = await createBucketTx.broadcast({
        denom: 'BNB',
        gasLimit: Number(simulateInfo?.gasLimit),
        gasPrice: simulateInfo?.gasPrice || '5000000000',
        payer: address,
        granter: '',
      });

      console.log(res);
      return res.code === 0;
    } catch (err: any) {
      if (err.message?.includes('Bucket already exists')) {
        return true;
      }
      throw err;
    }
  };

  const handleUpload = async () => {
    if (!imageUrl || !address || !isConnected) {
      setError('请先连接钱包');
      return;
    }

    if (chain?.id !== 5600) {
      try {
        await switchNetwork?.(5600);
      } catch (err) {
        setError('请切换到 Greenfield 测试网');
        return;
      }
    }
    
    setUploading(true);
    setError('');
    setUploadStatus('准备上传...');

    try {
      const provider = await connector?.getProvider();
      console.log('Provider:', provider);
      
      // 确保 bucket 存在
      const bucketCreated = await createBucket(address, provider);
      console.log('Bucket created:', bucketCreated);

      const offChainData = await getOffchainAuthKeys(address, provider);
      console.log('OffChain data:', offChainData);
      
      if (!offChainData) {
        throw new Error('离线认证失败');
      }

      // 3. 将图片转换为文件对象
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const file = new File([blob], `artwork-${Date.now()}.png`, { type: 'image/png' });

      // 使用 ReedSolomon 生成 checksum
      const fileBytes = await file.arrayBuffer();
      const expectCheckSums = rs.encode(new Uint8Array(fileBytes));

      // 4. 创建对象
      const objectName = file.name;
      const createObjectTx = await client.object.createObject({
        bucketName: BUCKET_NAME,
        objectName,
        creator: address,
        visibility: VisibilityType.VISIBILITY_TYPE_PUBLIC_READ,
        contentType: 'image/png',
        expectChecksums: expectCheckSums.map((x) => bytesFromBase64(x)),
        redundancyType: RedundancyType.REDUNDANCY_EC_TYPE,
        payloadSize: Long.fromNumber(file.size),
      });

      setUploadStatus('正在创建对象...');

      // 模拟并广播创建对象的交易
      const createObjectSimulateInfo = await createObjectTx.simulate({
        denom: 'BNB',
      });

      const createObjectRes = await createObjectTx.broadcast({
        denom: 'BNB',
        gasLimit: Number(createObjectSimulateInfo?.gasLimit),
        gasPrice: createObjectSimulateInfo?.gasPrice || '5000000000',
        payer: address,
        granter: '',
      });

      setUploadStatus('对象创建完成，正在上传文件...');

      // 5.上传文件
      const uploadRes = await client.object.uploadObject(
        {
          bucketName: BUCKET_NAME,
          objectName,
          body: file,
          txnHash: createObjectRes.transactionHash,
        },
        {
          type: 'EDDSA',
          domain: window.location.origin,
          seed: offChainData.seedString,
          address: address,
        },
      );

      setUploadStatus('上传完成！');

      console.log('Upload response:', uploadRes);

      if (uploadRes.code === 0) {
        setUploadStatus('上传完成！');
      } else {
        throw new Error(`上传失败: ${uploadRes.message || '未知错误'}`);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || '上传失败');
      setUploadStatus('');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-4xl font-bold mb-6">Generate AI Artwork</h1>
      
      <div className="bg-white p-6 rounded-lg shadow-md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-2">
              Describe the image you want to create
            </label>
            <textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={4}
              placeholder="Try asking for a style, a scene, or a character and see what you get. For example: a wolf running in the moonlight"
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2 px-4 rounded-md text-white font-medium
              ${loading 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700'
              }`}
          >
            {loading ? 'Generating...' : 'Generate Image'}
          </button>
        </form>

        {error && (
          <div className="mt-4 p-4 bg-red-50 text-red-600 rounded-md">
            {error}
          </div>
        )}

        {imageUrl && (
          <div className="mt-6">
            <h3 className="text-lg font-medium mb-3">Generation Result:</h3>
            <div className="relative w-full aspect-square">
              <Image
                src={imageUrl}
                alt="AI生成的图片"
                fill
                className="rounded-lg object-contain"
              />
            </div>
            <div className="mt-4 flex space-x-4">
              <a 
                href={imageUrl}
                download="ai-artwork.png"
                className="inline-block text-blue-600 hover:text-blue-800"
              >
                Download Image
              </a>
              <button
                onClick={handleUpload}
                disabled={uploading}
                className={`px-4 py-2 rounded-md text-white font-medium
                  ${uploading 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-green-600 hover:bg-green-700'
                  }`}
              >
                {uploading ? 'Uploading...' : 'Upload to Greenfield'}
              </button>
            </div>
            {uploadStatus && (
              <div className="mt-2 text-sm text-gray-600">
                {uploadStatus}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 