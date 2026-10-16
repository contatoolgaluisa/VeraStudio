import { type FormEvent, useId, useRef, useState } from 'react';
import { FormMessage, SelectField, TextField } from '@/components/form/TextField';
import { Button } from '@/components/ui/Button';
import { useDeleteImage, useReorderImages, useUpdateImage } from '../api';
import type { AdminImage, AdminProduct } from '../types';
import { ACCEPTED_IMAGE_TYPES, imageFileProblem, useUploadImage } from '../upload';
import { Thumb } from './Thumb';

function ColorOptions({ colors }: { colors: string[] }) {
  return (
    <>
      <option value="">Todas as cores</option>
      {colors.map((color) => (
        <option key={color} value={color}>
          {color}
        </option>
      ))}
    </>
  );
}

function ImageRow({
  image,
  index,
  total,
  colors,
  onMove,
  moving,
}: {
  image: AdminImage;
  index: number;
  total: number;
  colors: string[];
  onMove: (from: number, to: number) => void;
  moving: boolean;
}) {
  const update = useUpdateImage();
  const remove = useDeleteImage();
  const [alt, setAlt] = useState(image.alt);
  const [confirming, setConfirming] = useState(false);
  const label = `foto ${index + 1}`;
  const error = update.error ?? remove.error;

  function saveAlt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    update.mutate({ id: image.id, alt: alt.trim() });
  }

  return (
    <li className="flex flex-col gap-4 border-b border-line py-5 sm:flex-row">
      <Thumb url={image.url} className="w-24" />
      <div className="min-w-0 flex-1 space-y-4">
        <form onSubmit={saveAlt} className="flex items-end gap-2">
          <TextField
            label={`Descrição da ${label} (texto alternativo)`}
            value={alt}
            onChange={(event) => setAlt(event.target.value)}
            className="min-w-0 flex-1"
          />
          <Button
            type="submit"
            size="sm"
            variant="secondary"
            disabled={update.isPending || alt.trim() === image.alt || alt.trim().length < 3}
          >
            Salvar
          </Button>
        </form>
        <SelectField
          label={`Cor da ${label}`}
          value={image.color ?? ''}
          disabled={update.isPending}
          onChange={(event) => update.mutate({ id: image.id, color: event.target.value || null })}
          className="max-w-64"
        >
          <ColorOptions colors={colors} />
        </SelectField>
        {error && <FormMessage>{error.message}</FormMessage>}
      </div>
      <div className="flex flex-wrap items-start gap-2 sm:flex-col">
        <Button
          size="sm"
          variant="secondary"
          disabled={index === 0 || moving}
          aria-label={`Mover ${label} para cima`}
          onClick={() => onMove(index, index - 1)}
        >
          ↑
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={index === total - 1 || moving}
          aria-label={`Mover ${label} para baixo`}
          onClick={() => onMove(index, index + 1)}
        >
          ↓
        </Button>
        {confirming ? (
          <>
            <Button size="sm" disabled={remove.isPending} onClick={() => remove.mutate(image.id)}>
              Confirmar exclusão
            </Button>
            <Button size="sm" variant="text" onClick={() => setConfirming(false)}>
              Cancelar
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            variant="text"
            aria-label={`Excluir ${label}`}
            onClick={() => setConfirming(true)}
          >
            Excluir
          </Button>
        )}
      </div>
    </li>
  );
}

function UploadForm({ product, colors }: { product: AdminProduct; colors: string[] }) {
  const upload = useUploadImage(product.id);
  const fileRef = useRef<HTMLInputElement>(null);
  const [alt, setAlt] = useState('');
  const [color, setColor] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const fileId = useId();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return setProblem('Escolha um arquivo de imagem.');
    const fileProblem = imageFileProblem(file);
    if (fileProblem) return setProblem(fileProblem);
    if (alt.trim().length < 3) return setProblem('Descreva a foto (mínimo 3 caracteres).');
    setProblem(null);
    upload.mutate(
      { file, alt: alt.trim(), color: color || null },
      {
        onSuccess: () => {
          setAlt('');
          if (fileRef.current) fileRef.current.value = '';
        },
      },
    );
  }

  const message = problem ?? (upload.isError ? upload.error.message : null);

  return (
    <form
      onSubmit={submit}
      noValidate
      aria-labelledby="nova-foto-titulo"
      className="mt-8 border border-line p-5"
    >
      <h3 id="nova-foto-titulo" className="text-lg">
        Enviar foto
      </h3>
      <p className="mt-1 text-sm text-muted">JPG, PNG ou WebP, até 5 MB. Prefira retrato (3:4).</p>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div>
          <label htmlFor={fileId} className="text-sm font-medium">
            Arquivo
          </label>
          <input
            id={fileId}
            ref={fileRef}
            type="file"
            accept={ACCEPTED_IMAGE_TYPES.join(',')}
            className="mt-1.5 block w-full text-sm file:mr-3 file:border file:border-ink file:bg-transparent file:px-3 file:py-2 file:text-sm"
          />
        </div>
        <TextField
          label="Descrição (texto alternativo)"
          placeholder="Vestido preto de frente"
          hint="Lida por leitores de tela. Descreva a peça e a cor."
          value={alt}
          onChange={(event) => setAlt(event.target.value)}
        />
        <SelectField
          label="Cor mostrada"
          value={color}
          onChange={(event) => setColor(event.target.value)}
        >
          <ColorOptions colors={colors} />
        </SelectField>
      </div>
      {message && (
        <div className="mt-4">
          <FormMessage>{message}</FormMessage>
        </div>
      )}
      <Button type="submit" size="sm" className="mt-5" disabled={upload.isPending}>
        {upload.isPending ? 'Enviando…' : 'Enviar foto'}
      </Button>
    </form>
  );
}

export function ImagesSection({ product }: { product: AdminProduct }) {
  const reorder = useReorderImages();
  const colors = [...new Set(product.variants.map((variant) => variant.color))];

  function move(from: number, to: number) {
    const next = [...product.images];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item!);
    reorder.mutate(next);
  }

  return (
    <section aria-labelledby="fotos-titulo">
      <h2 id="fotos-titulo" className="text-2xl">
        Fotos
      </h2>
      <p className="mt-2 text-sm text-muted">
        A primeira foto é a capa na vitrine. Fotos ligadas a uma cor aparecem quando o cliente
        escolhe essa cor.
      </p>
      {reorder.isError && (
        <div className="mt-4">
          <FormMessage>{reorder.error.message}</FormMessage>
        </div>
      )}

      {product.images.length === 0 ? (
        <p className="mt-6 border border-dashed border-line p-5 text-sm">
          Nenhuma foto cadastrada. Sem fotos, a loja mostra um bloco neutro com o nome do produto.
        </p>
      ) : (
        <ol className="mt-4">
          {product.images.map((image, index) => (
            <ImageRow
              key={image.id}
              image={image}
              index={index}
              total={product.images.length}
              colors={colors}
              onMove={move}
              moving={reorder.isPending}
            />
          ))}
        </ol>
      )}

      <UploadForm product={product} colors={colors} />
    </section>
  );
}
