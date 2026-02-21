import * as React from "react";

/** Simple dialog open state helper. */
export default function useDialogState(defaultOpen: boolean = false) {
  const [open, setOpen] = React.useState<boolean>(defaultOpen);
  return [open, setOpen] as const;
}
