'use client';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import {X} from 'lucide-react';
export const Dialog=DialogPrimitive.Root;
export const DialogTitle=DialogPrimitive.Title;
export const DialogDescription=DialogPrimitive.Description;
export function DialogContent({children,drawer=false}:{children:React.ReactNode;drawer?:boolean}){return <DialogPrimitive.Portal><DialogPrimitive.Overlay className="dialog-overlay"/><DialogPrimitive.Content className={drawer?'drawer-content':'dialog-content'}>{children}<DialogPrimitive.Close className="dialog-close" aria-label="Close"><X size={18}/></DialogPrimitive.Close></DialogPrimitive.Content></DialogPrimitive.Portal>}
