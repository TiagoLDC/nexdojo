import { useEffect, useRef, useState } from 'react';
import { studentService } from '../services/studentService';

/**
 * Busca fotos de alunos em lote, sob demanda, para telas que carregam a lista de alunos sem
 * foto (includePhoto: false) mas precisam exibir o avatar de um subconjunto pequeno (ex: os
 * cards de graduação do dashboard). Um `useRef` evita reconsultar um id que já foi buscado.
 */
export function useStudentPhotos(ids: string[]): Record<string, string> {
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const requestedIds = useRef<Set<string>>(new Set());
  const idsKey = ids.join(',');

  useEffect(() => {
    const missing = ids.filter((id) => id && !requestedIds.current.has(id));
    if (!missing.length) return;
    missing.forEach((id) => requestedIds.current.add(id));

    studentService.getPhotos(missing)
      .then((result) => setPhotos((prev) => ({ ...prev, ...result })))
      .catch(() => missing.forEach((id) => requestedIds.current.delete(id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);

  return photos;
}
