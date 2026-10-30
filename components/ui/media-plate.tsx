import { cn } from '@/lib/utils';

/**
 * The archive's empty picture plate.
 *
 * Every box that has to stand there before (or without) a picture sits on this
 * one plate: the doorway resource boxes, the /live class boxes, the portrait
 * circles, the picture wall, the gallery skeleton. A grey rectangle reads as a
 * broken photograph; the yellow-blue wash reads as part of the room.
 *
 * One definition, so a new surface never invents its own grey. Pass layout
 * (aspect, size, radius, border, animate-pulse) through `className`; the wash
 * itself is not overridable.
 */
export function MediaPlate({ className, children, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      {...props}
      className={cn(
        'relative overflow-hidden bg-gradient-to-br from-lmsy-yellow/30 via-card to-lmsy-blue/35',
        className
      )}
    >
      {children}
    </div>
  );
}
