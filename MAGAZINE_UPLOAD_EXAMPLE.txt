/**
 * Magazine Upload Example
 * 使用 JavaScript/TypeScript 上传杂志的示例代码
 */

// 示例 1: 使用 fetch API 上传杂志
async function uploadMagazine(formData: {
  cover: File;
  title: string;
  releaseDate: string;
  description?: string;
  additionalImages?: File[];
  captions?: string[];
}) {
  const data = new FormData();

  // 必填字段
  data.append('cover', formData.cover);
  data.append('title', formData.title);
  data.append('release_date', formData.releaseDate);

  // 可选字段
  if (formData.description) {
    data.append('description', formData.description);
  }

  // 添加内页图片
  formData.additionalImages?.forEach((image) => {
    data.append('additional_images', image);
  });

  // 添加图片说明
  formData.captions?.forEach((caption, index) => {
    data.append(`caption_${index}`, caption);
  });

  const response = await fetch('/api/admin/magazine', {
    method: 'POST',
    // 注意：浏览器会自动包含认证 cookie
    body: data,
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || 'Upload failed');
  }

  return result;
}

// 示例 2: 实际使用
async function exampleUpload() {
  try {
    const cover = new File([''], 'cover.jpg', { type: 'image/jpeg' });
    const additionalImages = Array.from({ length: 19 }, (_, i) =>
      new File([''], `page-${i + 1}.jpg`, { type: 'image/jpeg' })
    );

    const result = await uploadMagazine({
      cover,
      title: 'October 2024 Special Issue',
      releaseDate: '2024-10-23',
      description: 'Capturing the ethereal beauty of Lookmhee and Sonya in their latest photo spread.',
      additionalImages,
      captions: [
        'Behind the scenes',
        'Candid moment',
        // ... 更多说明
      ],
    });

    console.log('Upload successful:', result.data);
    console.log('Catalog ID:', result.data.project.catalog_id);
    console.log('Artifact count:', result.data.project.artifact_count);
  } catch (error) {
    console.error('Upload failed:', error);
  }
}

// 示例 3: React Hook
import { useState } from 'react';

function useMagazineUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const upload = async (formData: {
    cover: File;
    title: string;
    releaseDate: string;
    description?: string;
    additionalImages?: File[];
  }) => {
    setUploading(true);
    setProgress(0);

    try {
      const data = new FormData();
      data.append('cover', formData.cover);
      data.append('title', formData.title);
      data.append('release_date', formData.releaseDate);

      if (formData.description) {
        data.append('description', formData.description);
      }

      formData.additionalImages?.forEach((image) => {
        data.append('additional_images', image);
      });

      const response = await fetch('/api/admin/magazine', {
        method: 'POST',
        body: data,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      setProgress(100);
      return await response.json();
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    } finally {
      setUploading(false);
    }
  };

  return { upload, uploading, progress };
}

// 使用示例
function MagazineUploadForm() {
  const { upload, uploading } = useMagazineUpload();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);

    await upload({
      cover: formData.get('cover') as File,
      title: formData.get('title') as string,
      releaseDate: formData.get('release_date') as string,
      description: formData.get('description') as string,
      // 从文件输入获取多个文件
      additionalImages: formData.getAll('additional_images') as File[],
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input type="file" name="cover" required />
      <input type="text" name="title" required />
      <input type="date" name="release_date" required />
      <textarea name="description" />
      <input type="file" name="additional_images" multiple />
      <button type="submit" disabled={uploading}>
        {uploading ? 'Uploading...' : 'Upload Magazine'}
      </button>
    </form>
  );
}
