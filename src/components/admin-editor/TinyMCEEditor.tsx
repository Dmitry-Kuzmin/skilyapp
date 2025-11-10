import { Editor } from '@tinymce/tinymce-react';
import { useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TinyMCEEditorProps {
  content?: string; // HTML content
  onChange?: (content: string) => void;
  onEditorReady?: (editor: any) => void;
  placeholder?: string;
  materialId?: string;
  editable?: boolean;
  height?: number;
}

export const TinyMCEEditor = ({
  content = '',
  onChange,
  onEditorReady,
  placeholder = 'Начните вводить текст...',
  materialId,
  editable = true,
  height = 600,
}: TinyMCEEditorProps) => {
  const editorRef = useRef<any>(null);

  // Handle image upload to Supabase Storage
  const handleImageUpload = useCallback(
    async (blobInfo: any, progress: (percent: number) => void): Promise<string> => {
      try {
        if (!materialId) {
          throw new Error('Material ID is required for image upload');
        }

        // Show upload progress
        progress(0);

        const blob = blobInfo.blob();
        const filename = blobInfo.filename() || 'image.png';
        
        // Определяем расширение файла из имени или из типа blob
        let fileExt = filename.split('.').pop()?.toLowerCase() || 'png';
        
        // Если расширение не найдено или невалидное, определяем по MIME типу
        if (!fileExt || !['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(fileExt)) {
          const mimeType = blob.type;
          if (mimeType.includes('jpeg')) fileExt = 'jpg';
          else if (mimeType.includes('png')) fileExt = 'png';
          else if (mimeType.includes('gif')) fileExt = 'gif';
          else if (mimeType.includes('webp')) fileExt = 'webp';
          else if (mimeType.includes('svg')) fileExt = 'svg';
          else fileExt = 'png'; // По умолчанию PNG
        }

        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `materials/images/${materialId}/${fileName}`;

        // Validate file size (5MB limit)
        if (blob.size > 5 * 1024 * 1024) {
          throw new Error('Размер изображения не должен превышать 5MB');
        }

        // Validate file type - проверяем и по MIME типу, и по расширению
        const isValidImageType = 
          blob.type.startsWith('image/') || 
          ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(fileExt);

        if (!isValidImageType) {
          console.warn('Invalid file type:', {
            blobType: blob.type,
            filename: filename,
            fileExt: fileExt,
            blobSize: blob.size
          });
          throw new Error(`Неподдерживаемый тип файла: ${blob.type || fileExt}. Разрешены только изображения (JPG, PNG, GIF, WebP, SVG)`);
        }

        // Если MIME тип неправильный, но расширение валидное, создаем новый Blob с правильным типом
        let fileToUpload: Blob = blob;
        if (!blob.type.startsWith('image/') && ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(fileExt)) {
          // Определяем правильный MIME тип по расширению
          const mimeTypes: Record<string, string> = {
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'webp': 'image/webp',
            'svg': 'image/svg+xml',
          };
          const correctMimeType = mimeTypes[fileExt] || 'image/png';
          fileToUpload = new Blob([blob], { type: correctMimeType });
        }

        progress(30);

        // Upload to Supabase Storage
        const { data, error: uploadError } = await supabase.storage
          .from('materials')
          .upload(filePath, fileToUpload, {
            cacheControl: '3600',
            upsert: false,
            contentType: fileToUpload.type,
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          // Более понятное сообщение об ошибке
          if (uploadError.message.includes('mime type')) {
            throw new Error(`Неподдерживаемый тип файла. Разрешены только изображения: JPG, PNG, GIF, WebP, SVG`);
          }
          throw new Error(`Ошибка загрузки: ${uploadError.message}`);
        }

        progress(70);

        // Get public URL
        const {
          data: { publicUrl },
        } = supabase.storage.from('materials').getPublicUrl(filePath);

        progress(100);
        toast.success('Изображение загружено');
        return publicUrl;
      } catch (error: any) {
        console.error('Error uploading image:', error);
        const errorMessage = error.message || 'Ошибка загрузки изображения';
        toast.error(errorMessage);
        throw error;
      }
    },
    [materialId]
  );

  const handleEditorChange = useCallback(
    (content: string, editor: any) => {
      onChange?.(content);
    },
    [onChange]
  );

  const handleEditorInit = useCallback(
    (evt: any, editor: any) => {
      editorRef.current = editor;
      onEditorReady?.(editor);
    },
    [onEditorReady]
  );

  return (
    <div className="w-full border border-border rounded-lg overflow-hidden">
      <Editor
        apiKey={import.meta.env.VITE_TINYMCE_API_KEY || "7psvx9d062hjae35ppbkha56wl6p9wfnffvr3w1ie8yf71fq"}
        onInit={handleEditorInit}
        value={content}
        onEditorChange={handleEditorChange}
        init={{
          height,
          menubar: true,
          plugins: [
            'advlist',
            'autolink',
            'lists',
            'link',
            'image',
            'charmap',
            'preview',
            'anchor',
            'searchreplace',
            'visualblocks',
            'code',
            'fullscreen',
            'insertdatetime',
            'media',
            'table',
            'code',
            'help',
            'wordcount',
            'emoticons',
            'directionality',
            'visualchars',
            'nonbreaking',
            'pagebreak',
            'quickbars',
            'codesample',
          ],
          toolbar:
            'undo redo | blocks | ' +
            'bold italic forecolor | alignleft aligncenter ' +
            'alignright alignjustify | bullist numlist outdent indent | ' +
            'removeformat | link image table code | fullscreen preview | help',
          content_style: `
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              font-size: 16px;
              line-height: 1.6;
              color: hsl(var(--foreground));
              background: hsl(var(--background));
              padding: 20px;
            }
            img {
              max-width: 100%;
              height: auto;
              border-radius: 8px;
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
              margin: 16px 0;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 16px 0;
            }
            table td, table th {
              border: 1px solid hsl(var(--border));
              padding: 12px;
            }
            table th {
              background: hsl(var(--muted));
              font-weight: 600;
            }
            blockquote {
              border-left: 4px solid hsl(var(--primary));
              padding-left: 16px;
              margin: 16px 0;
              color: hsl(var(--muted-foreground));
            }
            code {
              background: hsl(var(--muted));
              padding: 2px 6px;
              border-radius: 4px;
              font-family: 'Courier New', monospace;
            }
            pre {
              background: hsl(var(--muted));
              padding: 16px;
              border-radius: 8px;
              overflow-x: auto;
            }
            a {
              color: hsl(var(--primary));
              text-decoration: underline;
            }
          `,
          skin: 'oxide',
          content_css: 'default',
          placeholder,
          automatic_uploads: true,
          images_upload_handler: handleImageUpload,
          file_picker_types: 'image',
          images_file_types: 'jpg,jpeg,png,gif,webp,svg',
          image_advtab: true,
          image_caption: true,
          image_title: true,
          image_description: true,
          image_dimensions: true,
          image_resize: true,
          image_uploadtab: true,
          image_class_list: [
            { title: 'Responsive', value: 'img-responsive' },
            { title: 'Rounded', value: 'img-rounded' },
            { title: 'Bordered', value: 'img-bordered' },
          ],
          table_toolbar: 'tableprops tabledelete | tableinsertrowbefore tableinsertrowafter tabledeleterow | tableinsertcolbefore tableinsertcolafter tabledeletecol',
          table_appearance_options: false,
          table_grid: true,
          table_resize_bars: true,
          table_default_attributes: {
            border: '1',
          },
          table_default_styles: {
            'border-collapse': 'collapse',
            width: '100%',
          },
          table_class_list: [
            { title: 'None', value: '' },
            { title: 'Striped', value: 'table-striped' },
            { title: 'Bordered', value: 'table-bordered' },
          ],
          link_assume_external_targets: true,
          link_context_toolbar: true,
          link_title: true,
          paste_data_images: true,
          paste_as_text: false,
          paste_auto_cleanup_on_paste: true,
          paste_remove_styles: false,
          paste_remove_spans: false,
          paste_strip_class_attributes: 'none',
          branding: false,
          promotion: false,
          resize: true,
          elementpath: true,
          statusbar: true,
          setup: (editor: any) => {
            // Добавляем кастомные стили для таблиц
            editor.on('init', () => {
              editor.dom.addStyle(`
                .mce-content-body table {
                  width: 100%;
                  border-collapse: collapse;
                  margin: 16px 0;
                }
                .mce-content-body table td,
                .mce-content-body table th {
                  border: 1px solid hsl(var(--border));
                  padding: 12px;
                }
                .mce-content-body table th {
                  background: hsl(var(--muted));
                  font-weight: 600;
                }
                .mce-content-body img {
                  max-width: 100%;
                  height: auto;
                  border-radius: 8px;
                  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                  margin: 16px 0;
                }
              `);
            });
          },
        }}
        disabled={!editable}
      />
    </div>
  );
};

