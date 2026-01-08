'use client';

interface EditorialHeaderProps {
  title: string;
  description: string;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
}

export default function EditorialHeader({
  title,
  description,
  onTitleChange,
  onDescriptionChange
}: EditorialHeaderProps) {
  return (
    <div className="space-y-5">
      {/* Title Input - Huge Serif */}
      <div className="space-y-2">
        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Untitled Orbit"
          className="w-full bg-transparent text-4xl md:text-5xl font-serif text-white/90 placeholder-white/20 focus:outline-none border-b transition-all duration-300"
          style={{
            borderColor: 'rgba(255, 255, 255, 0.06)',
            borderWidth: '0.5px',
            fontFamily: 'var(--font-playfair), Georgia, serif',
            lineHeight: '1.2',
          }}
          onFocus={(e) => {
            e.target.style.borderColor = 'rgba(251, 191, 36, 0.2)';
            e.target.style.textShadow = '0 0 20px rgba(251, 191, 36, 0.1)';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = 'rgba(255, 255, 255, 0.06)';
            e.target.style.textShadow = 'none';
          }}
        />
        <div className="text-[9px] font-mono text-white/15 tracking-[0.3em] uppercase">
          Orbit Title
        </div>
      </div>

      {/* Curator's Statement - Description */}
      <div className="space-y-2">
        <textarea
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="Write the narrative for this orbit..."
          rows={3}
          className="w-full bg-transparent text-sm text-white/50 placeholder-white/15 focus:outline-none resize-none leading-relaxed transition-all duration-300"
          style={{ lineHeight: '1.8' }}
          onFocus={(e) => {
            e.target.style.color = 'rgba(255, 255, 255, 0.7)';
          }}
          onBlur={(e) => {
            e.target.style.color = 'rgba(255, 255, 255, 0.5)';
          }}
        />
        <div className="text-[9px] font-mono text-white/15 tracking-[0.3em] uppercase">
          Curator's Statement
        </div>
      </div>
    </div>
  );
}
