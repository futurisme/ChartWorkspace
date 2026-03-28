export interface DisclosureAttributesOptions {
  idBase: string;
  open: boolean;
  disabled?: boolean;
}

export function buildDisclosureAttributes({
  idBase,
  open,
  disabled = false,
}: DisclosureAttributesOptions) {
  const triggerId = `${idBase}-trigger`;
  const contentId = `${idBase}-content`;
  const dataState = open ? 'open' : 'closed';

  return {
    triggerId,
    contentId,
    triggerProps: {
      id: triggerId,
      type: 'button' as const,
      'aria-expanded': open,
      'aria-controls': contentId,
      disabled,
      'data-state': dataState,
    },
    contentProps: {
      id: contentId,
      role: 'region' as const,
      hidden: !open,
      'aria-labelledby': triggerId,
      'data-state': dataState,
    },
  };
}
