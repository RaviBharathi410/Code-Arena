import { useContext } from 'react';
import { LenisContext } from '../contexts/ScrollProvider';

/**
 * Exposes the active Lenis instance so any component can call
 * lenis.scrollTo('#section', { offset: -80 }) for smooth anchor nav.
 */
export const useLenis = () => useContext(LenisContext);
