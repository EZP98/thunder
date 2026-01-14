import { useState, useRef, useEffect } from 'react';

// ============================================
// THUNDER v1 - AI Landing Page Editor
// ============================================

const ThunderEditor = () => {
  const [messages, setMessages] = useState<Array<{role: string, content: string}>>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [activeTab, setActiveTab] = useState('chat');
  const [consoleLog, setConsoleLog] = useState<Array<{time: string, type: string, message: string, data: string | null}>>([]);
  const [viewport, setViewport] = useState('desktop');

  // Design state - supports multiple sections
  const [design, setDesign] = useState({
    style: 'linear',
    sections: [
      {
        type: 'hero',
        background: '#0a0a0a',
        glow: { enabled: true, color: 'rgba(99,102,241,0.2)', position: 'bottom' },
        badge: { show: true, text: '⚡ Introducing Thunder' },
        heading: {
          text: 'Design with AI.\nShip real code.',
          fontSize: 72,
          fontWeight: 600,
          letterSpacing: -2,
          gradient: null as string | null,
        },
        subheading: {
          text: 'Create stunning interfaces with natural language. Export production-ready React.',
          fontSize: 18,
          opacity: 0.6,
        },
        buttons: [
          { text: 'Start Creating', icon: '→', variant: 'primary' },
          { text: 'Watch Demo', icon: '▶', variant: 'ghost' },
        ],
        backgroundImage: null as string | null,
      }
    ],
  });

  const chatRef = useRef<HTMLDivElement>(null);

  const palettes: Record<string, {accent: string, glow: string, bg: string}> = {
    linear: { accent: '#6366f1', glow: 'rgba(99,102,241,0.25)', bg: '#0a0a0a' },
    vercel: { accent: '#ffffff', glow: 'rgba(255,255,255,0.15)', bg: '#000' },
    stripe: { accent: '#635bff', glow: 'rgba(99,91,255,0.25)', bg: '#0a2540' },
    apple: { accent: '#2997ff', glow: 'rgba(41,151,255,0.2)', bg: '#000' },
    nature: { accent: '#22c55e', glow: 'rgba(34,197,94,0.2)', bg: '#0a0a0a' },
    sunset: { accent: '#f97316', glow: 'rgba(249,115,22,0.25)', bg: '#1a0a0a' },
  };

  const palette = palettes[design.style] || palettes.linear;

  const viewportSizes: Record<string, {width: string, maxWidth: string}> = {
    desktop: { width: '100%', maxWidth: '1200px' },
    tablet: { width: '768px', maxWidth: '768px' },
    mobile: { width: '375px', maxWidth: '375px' },
  };

  const log = (type: string, msg: string, data: unknown = null) => {
    const entry = {
      time: new Date().toLocaleTimeString(),
      type,
      message: msg,
      data: data ? (typeof data === 'string' ? data : JSON.stringify(data, null, 2)) : null
    };
    setConsoleLog(prev => [...prev.slice(-50), entry]);
  };

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  // ============================================
  // IDEOGRAM
  // ============================================
  const generateImage = async (prompt: string, sectionIndex = 0) => {
    log('info', '🎨 Generating image...');
    setMessages(prev => [...prev, { role: 'assistant', content: '🎨 Generating image...' }]);

    try {
      const response = await fetch('https://api.ideogram.ai/generate', {
        method: 'POST',
        headers: {
          'Api-Key': import.meta.env.VITE_IDEOGRAM_API_KEY || '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_request: {
            prompt: `${prompt}, dark background, minimalist, professional, 8k`,
            aspect_ratio: 'ASPECT_16_9',
            model: 'V_2',
            style_type: 'DESIGN',
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.data?.[0]?.url) {
        setDesign(prev => {
          const newSections = [...prev.sections];
          if (newSections[sectionIndex]) {
            newSections[sectionIndex] = {
              ...newSections[sectionIndex],
              backgroundImage: data.data[0].url
            };
          }
          return { ...prev, sections: newSections };
        });
        log('success', '✅ Image generated!');
        setMessages(prev => [...prev, { role: 'assistant', content: '✅ Image added!' }]);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log('error', `Image error: ${errorMessage}`);
      setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ Image generation unavailable. Design updated without image.` }]);
    }
  };

  // ============================================
  // CLAUDE API
  // ============================================
  const SYSTEM_PROMPT = `You are Thunder AI, an expert UI designer. You create multi-section landing pages.

## CURRENT DESIGN
\`\`\`json
${JSON.stringify(design, null, 2)}
\`\`\`

## CAPABILITIES
1. Create/modify sections (hero, features, testimonials, pricing, cta)
2. Change styles (linear, vercel, stripe, apple, nature, sunset)
3. Request image generation

## SECTION TYPES
- hero: Main hero with heading, subheading, buttons
- features: Grid of feature cards
- testimonials: Customer quotes
- pricing: Pricing cards
- cta: Call to action banner

## RESPONSE FORMAT (JSON only)
{
  "message": "Short response",
  "changes": {
    "style": "linear",
    "sections": [ ... ]
  },
  "generateImage": false,
  "imagePrompt": ""
}

## EXAMPLES

User: "crea pagina con 3 sezioni tema mele"
{
  "message": "Creata pagina a tema mele con 3 sezioni!",
  "changes": {
    "style": "nature",
    "sections": [
      {
        "type": "hero",
        "background": "#0a0f0a",
        "glow": { "enabled": true, "color": "rgba(239,68,68,0.2)", "position": "bottom" },
        "badge": { "show": true, "text": "🍎 Fresh & Organic" },
        "heading": { "text": "The Perfect Apple.\\nNature's Masterpiece.", "fontSize": 80, "fontWeight": 700, "letterSpacing": -3, "gradient": "linear-gradient(135deg, #ef4444, #f97316)" },
        "subheading": { "text": "Discover three exceptional varieties. Crisp, sweet, and sustainably grown.", "fontSize": 18, "opacity": 0.7 },
        "buttons": [{ "text": "Explore Varieties", "icon": "→", "variant": "primary" }, { "text": "Our Orchard", "icon": "🌳", "variant": "ghost" }]
      },
      {
        "type": "features",
        "background": "#050805",
        "title": "Three Premium Varieties",
        "items": [
          { "icon": "🍎", "title": "Royal Gala", "description": "Sweet and aromatic with a beautiful red skin" },
          { "icon": "🍏", "title": "Granny Smith", "description": "Perfectly tart and refreshingly crisp" },
          { "icon": "🔴", "title": "Fuji", "description": "Ultra-sweet with a satisfying crunch" }
        ]
      },
      {
        "type": "cta",
        "background": "linear-gradient(135deg, #1a0a0a, #0a0a0a)",
        "heading": "Taste the Difference",
        "subheading": "Order fresh apples delivered to your door",
        "button": { "text": "Shop Now", "icon": "→" }
      }
    ]
  },
  "generateImage": true,
  "imagePrompt": "beautiful red apples on dark background, dramatic lighting, professional food photography"
}

User: "make it bold"
{
  "message": "Made it bolder!",
  "changes": {
    "sections": [{
      "heading": { "fontSize": 96, "fontWeight": 700, "gradient": "linear-gradient(135deg, #fff, #6366f1)" },
      "glow": { "color": "rgba(99,102,241,0.4)" }
    }]
  }
}

IMPORTANT: Return ONLY valid JSON.`;

  const callClaude = async (userMessage: string) => {
    log('request', 'Sending to Claude...');

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY || '',
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2048,
          system: SYSTEM_PROMPT,
          messages: [
            ...messages.slice(-4).map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: userMessage }
          ],
        }),
      });

      const data = await response.json();

      if (data.error) {
        log('error', data.error.message);
        return { error: data.error.message };
      }

      const text = data.content?.[0]?.text || '';
      log('response', 'Claude responded');

      let parsed;
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text);
      } catch {
        log('error', 'JSON parse failed');
        return { message: text || 'Done!' };
      }

      // Apply changes
      if (parsed.changes) {
        setDesign(prev => {
          const updated = { ...prev };

          if (parsed.changes.style) {
            updated.style = parsed.changes.style;
          }

          if (parsed.changes.sections) {
            // Full replace or merge
            if (parsed.changes.sections.length > 0 && parsed.changes.sections[0].type) {
              // Full sections array
              updated.sections = parsed.changes.sections;
            } else {
              // Partial update to first section
              updated.sections = prev.sections.map((sec, i) => {
                if (parsed.changes.sections[i]) {
                  return deepMerge(sec, parsed.changes.sections[i]);
                }
                return sec;
              });
            }
          }

          log('success', 'Design updated');
          return updated;
        });
      }

      if (parsed.generateImage && parsed.imagePrompt) {
        generateImage(parsed.imagePrompt);
      }

      return { message: parsed.message || 'Done!' };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log('error', errorMessage);
      return { error: errorMessage };
    }
  };

  const deepMerge = <T extends Record<string, unknown>>(target: T, source: Record<string, unknown>): T => {
    const result = { ...target } as T;
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key as keyof T] = deepMerge((target[key] as Record<string, unknown>) || {}, source[key] as Record<string, unknown>) as T[keyof T];
      } else {
        result[key as keyof T] = source[key] as T[keyof T];
      }
    }
    return result;
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);

    const result = await callClaude(userMsg);
    const reply = 'error' in result ? `❌ ${result.error}` : `✅ ${result.message}`;
    setMessages(prev => [...prev, { role: 'assistant', content: reply }]);

    setIsLoading(false);
  };

  const presets = [
    { label: '🟣 Linear', prompt: 'Apply Linear style' },
    { label: '⚫ Vercel', prompt: 'Apply Vercel style' },
    { label: '🍎 Apple', prompt: 'Apple style - huge fonts' },
    { label: '⚡ Bold', prompt: 'Make it more bold' },
    { label: '🖼️ Image', prompt: 'Add hero background image' },
    { label: '🔮 Glass', prompt: 'Glass effect buttons' },
    { label: '🌈 Gradient', prompt: 'Gradient text heading' },
  ];

  // ============================================
  // SECTION TYPES
  // ============================================
  interface SectionBase {
    type: string;
    background?: string;
    backgroundImage?: string | null;
  }

  interface HeroSectionType extends SectionBase {
    type: 'hero';
    glow?: { enabled: boolean; color: string; position: string };
    badge?: { show: boolean; text: string };
    heading?: { text: string; fontSize: number; fontWeight: number; letterSpacing: number; gradient: string | null };
    subheading?: { text: string; fontSize: number; opacity: number };
    buttons?: Array<{ text: string; icon: string; variant: string }>;
  }

  interface FeaturesSectionType extends SectionBase {
    type: 'features';
    title?: string;
    items?: Array<{ icon: string; title: string; description: string }>;
  }

  interface CTASectionType extends SectionBase {
    type: 'cta';
    heading?: string;
    subheading?: string;
    button?: { text: string; icon: string };
  }

  type SectionType = HeroSectionType | FeaturesSectionType | CTASectionType;

  // ============================================
  // SECTION RENDERERS
  // ============================================
  const HeroSection = ({ section, palette: p }: { section: HeroSectionType; palette: typeof palette }) => {
    const isMobile = viewport === 'mobile';

    return (
      <section style={{
        minHeight: viewport === 'desktop' ? '100vh' : 'auto',
        background: section.background || '#0a0a0a',
        backgroundImage: section.backgroundImage ? `url(${section.backgroundImage})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isMobile ? '80px 20px' : '120px 40px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {section.backgroundImage && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to top, rgba(0,0,0,0.95), rgba(0,0,0,0.5))',
          }} />
        )}

        {section.glow?.enabled && (
          <div style={{
            position: 'absolute',
            [section.glow.position || 'bottom']: '-50%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '140%',
            height: '100%',
            background: `radial-gradient(ellipse, ${section.glow.color || p.glow} 0%, transparent 70%)`,
            pointerEvents: 'none',
          }} />
        )}

        <div style={{ maxWidth: '900px', position: 'relative', zIndex: 1 }}>
          {section.badge?.show && (
            <span style={{
              display: 'inline-flex',
              padding: '8px 16px',
              borderRadius: '100px',
              background: `${p.accent}15`,
              border: `1px solid ${p.accent}30`,
              color: p.accent,
              fontSize: isMobile ? '12px' : '14px',
              fontWeight: 500,
              marginBottom: '24px',
            }}>
              {section.badge.text}
            </span>
          )}

          <h1 style={{
            fontSize: isMobile ? `${(section.heading?.fontSize || 72) * 0.5}px` : `clamp(48px, 8vw, ${section.heading?.fontSize || 72}px)`,
            fontWeight: section.heading?.fontWeight || 600,
            letterSpacing: `${section.heading?.letterSpacing || -2}px`,
            lineHeight: 1.05,
            color: '#ffffff',
            marginBottom: '24px',
            whiteSpace: 'pre-line',
            background: section.heading?.gradient || 'none',
            WebkitBackgroundClip: section.heading?.gradient ? 'text' : 'unset',
            WebkitTextFillColor: section.heading?.gradient ? 'transparent' : 'unset',
          }}>
            {section.heading?.text || 'Heading'}
          </h1>

          <p style={{
            fontSize: isMobile ? '14px' : `${section.subheading?.fontSize || 18}px`,
            color: `rgba(255,255,255,${section.subheading?.opacity || 0.6})`,
            lineHeight: 1.7,
            maxWidth: '560px',
            margin: '0 auto 40px',
          }}>
            {section.subheading?.text || 'Subheading'}
          </p>

          {section.buttons && (
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center',
              flexWrap: 'wrap',
              flexDirection: isMobile ? 'column' : 'row',
            }}>
              {section.buttons.map((btn, i) => (
                <button key={i} style={{
                  padding: '14px 28px',
                  borderRadius: '12px',
                  border: btn.variant === 'outline' ? `1px solid ${p.accent}` : 'none',
                  background: btn.variant === 'primary'
                    ? `linear-gradient(135deg, ${p.accent}, ${p.accent}cc)`
                    : btn.variant === 'glass' ? 'rgba(255,255,255,0.05)' : 'transparent',
                  backdropFilter: btn.variant === 'glass' ? 'blur(12px)' : 'none',
                  color: btn.variant === 'ghost' ? 'rgba(255,255,255,0.7)' : 'white',
                  fontSize: '14px',
                  fontWeight: btn.variant === 'primary' ? 600 : 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: btn.variant === 'primary' ? `0 8px 30px ${p.glow}` : 'none',
                }}>
                  {btn.icon && btn.variant !== 'primary' && <span>{btn.icon}</span>}
                  {btn.text}
                  {btn.icon && btn.variant === 'primary' && <span>{btn.icon}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>
    );
  };

  const FeaturesSection = ({ section }: { section: FeaturesSectionType; palette: typeof palette }) => {
    const isMobile = viewport === 'mobile';

    return (
      <section style={{
        background: section.background || '#050505',
        padding: isMobile ? '60px 20px' : '100px 40px',
      }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          {section.title && (
            <h2 style={{
              fontSize: isMobile ? '28px' : '40px',
              fontWeight: 600,
              textAlign: 'center',
              marginBottom: '60px',
              color: '#fff',
            }}>
              {section.title}
            </h2>
          )}

          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
            gap: '24px',
          }}>
            {section.items?.map((item, i) => (
              <div key={i} style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '16px',
                padding: '32px',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>{item.icon}</div>
                <h3 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '12px', color: '#fff' }}>
                  {item.title}
                </h3>
                <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  };

  const CTASection = ({ section, palette: p }: { section: CTASectionType; palette: typeof palette }) => {
    const isMobile = viewport === 'mobile';

    return (
      <section style={{
        background: section.background || 'linear-gradient(135deg, #1a0a1a, #0a0a0a)',
        padding: isMobile ? '60px 20px' : '100px 40px',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h2 style={{
            fontSize: isMobile ? '32px' : '48px',
            fontWeight: 700,
            marginBottom: '16px',
            color: '#fff',
          }}>
            {section.heading || 'Ready to start?'}
          </h2>
          <p style={{
            fontSize: '18px',
            color: 'rgba(255,255,255,0.6)',
            marginBottom: '32px',
          }}>
            {section.subheading || 'Join thousands of happy customers'}
          </p>
          {section.button && (
            <button style={{
              padding: '16px 32px',
              borderRadius: '12px',
              border: 'none',
              background: `linear-gradient(135deg, ${p.accent}, ${p.accent}cc)`,
              color: 'white',
              fontSize: '16px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: `0 8px 30px ${p.glow}`,
            }}>
              {section.button.text} {section.button.icon}
            </button>
          )}
        </div>
      </section>
    );
  };

  const renderSection = (section: SectionType, index: number) => {
    switch (section.type) {
      case 'hero':
        return <HeroSection key={index} section={section as HeroSectionType} palette={palette} />;
      case 'features':
        return <FeaturesSection key={index} section={section as FeaturesSectionType} palette={palette} />;
      case 'cta':
        return <CTASection key={index} section={section as CTASectionType} palette={palette} />;
      default:
        return <HeroSection key={index} section={section as HeroSectionType} palette={palette} />;
    }
  };

  // ============================================
  // GENERATE CODE
  // ============================================
  const generateReactCode = () => {
    return `import React from 'react';

// Generated by Thunder AI
const LandingPage = () => {
  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh' }}>
      ${design.sections.map((s, i) => `
      {/* Section ${i + 1}: ${s.type} */}
      <section style={{
        padding: '100px 40px',
        background: '${s.background || '#0a0a0a'}',
        textAlign: 'center',
      }}>
        ${s.type === 'hero' ? `
        <h1 style={{ fontSize: '${s.heading?.fontSize || 72}px', fontWeight: ${s.heading?.fontWeight || 600} }}>
          ${s.heading?.text || 'Heading'}
        </h1>
        <p style={{ fontSize: '${s.subheading?.fontSize || 18}px', opacity: ${s.subheading?.opacity || 0.6} }}>
          ${s.subheading?.text || 'Subheading'}
        </p>
        ` : s.type === 'features' ? `
        <h2>${(s as unknown as FeaturesSectionType).title || 'Features'}</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
          ${(s as unknown as FeaturesSectionType).items?.map(item => `
          <div>
            <span>${item.icon}</span>
            <h3>${item.title}</h3>
            <p>${item.description}</p>
          </div>
          `).join('') || ''}
        </div>
        ` : `
        <h2>${(s as unknown as CTASectionType).heading || 'CTA'}</h2>
        <p>${(s as unknown as CTASectionType).subheading || ''}</p>
        `}
      </section>
      `).join('')}
    </div>
  );
};

export default LandingPage;`;
  };

  // ============================================
  // RENDER
  // ============================================
  return (
    <div style={{
      width: '100%',
      height: '100vh',
      background: '#09090b',
      fontFamily: "'Inter', -apple-system, sans-serif",
      color: 'white',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: rgba(0,0,0,0.2); }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.25); }
        @keyframes pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }
      `}</style>

      {/* HEADER */}
      <header style={{
        height: '52px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        background: 'rgba(9,9,11,0.95)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => setShowChat(!showChat)} style={{
            width: '34px', height: '34px', borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.08)',
            background: showChat ? 'rgba(255,255,255,0.06)' : 'transparent',
            color: 'rgba(255,255,255,0.6)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>☰</button>
          <div style={{
            width: '28px', height: '28px', borderRadius: '8px',
            background: `linear-gradient(135deg, ${palette.accent}, ${palette.accent}88)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '12px', fontWeight: 700,
          }}>⚡</div>
          <span style={{ fontSize: '14px', fontWeight: 600 }}>Thunder</span>
          <span style={{
            fontSize: '10px', padding: '3px 8px', borderRadius: '6px',
            background: 'rgba(34,197,94,0.1)', color: '#22c55e', fontWeight: 500,
          }}>v1</span>
        </div>

        {/* Viewport */}
        <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '4px' }}>
          {['desktop', 'tablet', 'mobile'].map(v => (
            <button key={v} onClick={() => setViewport(v)} style={{
              padding: '6px 12px', borderRadius: '6px', border: 'none',
              background: viewport === v ? 'rgba(255,255,255,0.08)' : 'transparent',
              color: viewport === v ? 'white' : 'rgba(255,255,255,0.4)',
              fontSize: '12px', cursor: 'pointer',
            }}>
              {v === 'desktop' ? '🖥️' : v === 'tablet' ? '📱' : '📲'}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => {
            navigator.clipboard.writeText(generateReactCode());
            log('success', 'Code copied!');
          }} style={{
            padding: '8px 16px', borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'transparent', color: 'rgba(255,255,255,0.7)',
            fontSize: '12px', fontWeight: 500, cursor: 'pointer',
          }}>Copy Code</button>
          <button style={{
            padding: '8px 20px', borderRadius: '8px', border: 'none',
            background: `linear-gradient(135deg, ${palette.accent}, ${palette.accent}cc)`,
            color: 'white', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
            boxShadow: `0 4px 20px ${palette.glow}`,
          }}>Export</button>
        </div>
      </header>

      {/* MAIN */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* SIDEBAR */}
        {showChat && (
          <aside style={{
            width: '380px', minWidth: '380px',
            borderRight: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', flexDirection: 'column',
            background: '#09090b',
          }}>
            <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {['chat', 'code', 'console'].map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} style={{
                  flex: 1, padding: '12px', background: 'transparent', border: 'none',
                  color: activeTab === tab ? 'white' : 'rgba(255,255,255,0.4)',
                  fontSize: '12px', fontWeight: 500, cursor: 'pointer',
                  borderBottom: activeTab === tab ? `2px solid ${palette.accent}` : '2px solid transparent',
                  textTransform: 'capitalize',
                }}>{tab}</button>
              ))}
            </div>

            {activeTab === 'chat' && (
              <>
                <div ref={chatRef} style={{
                  flex: 1, overflowY: 'auto', padding: '16px',
                  display: 'flex', flexDirection: 'column', gap: '12px',
                }}>
                  {messages.length === 0 && (
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', textAlign: 'center', padding: '40px 20px' }}>
                      <div style={{ fontSize: '32px', marginBottom: '12px' }}>⚡</div>
                      <p>Describe your design</p>
                      <p style={{ opacity: 0.6, fontSize: '12px', marginTop: '8px' }}>
                        "Create a landing page with 3 sections"
                      </p>
                    </div>
                  )}
                  {messages.map((m, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                      <div style={{
                        maxWidth: '85%', padding: '10px 14px',
                        borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                        background: m.role === 'user' ? palette.accent : 'rgba(255,255,255,0.05)',
                        fontSize: '13px', lineHeight: 1.5,
                      }}>{m.content}</div>
                    </div>
                  ))}
                  {isLoading && (
                    <div style={{ display: 'flex', gap: '4px', padding: '10px' }}>
                      {[0,1,2].map(i => (
                        <div key={i} style={{
                          width: '6px', height: '6px', borderRadius: '50%',
                          background: palette.accent, animation: `pulse 1s ${i * 0.15}s infinite`,
                        }} />
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ padding: '12px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {presets.map((p, i) => (
                    <button key={i} onClick={() => setInput(p.prompt)} style={{
                      padding: '6px 10px', borderRadius: '6px',
                      border: '1px solid rgba(255,255,255,0.06)',
                      background: 'rgba(255,255,255,0.02)',
                      color: 'rgba(255,255,255,0.6)', fontSize: '11px', cursor: 'pointer',
                    }}>{p.label}</button>
                  ))}
                </div>

                <div style={{ padding: '12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{
                    background: 'rgba(255,255,255,0.02)', borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.08)', padding: '12px',
                    display: 'flex', alignItems: 'flex-end', gap: '10px',
                  }}>
                    <textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                      placeholder="Describe the design..."
                      rows={1}
                      style={{
                        flex: 1, background: 'transparent', border: 'none', outline: 'none',
                        color: 'white', fontSize: '13px', lineHeight: 1.5, resize: 'none',
                      }}
                    />
                    <button onClick={handleSend} disabled={!input.trim() || isLoading} style={{
                      width: '32px', height: '32px', borderRadius: '8px', border: 'none',
                      background: input.trim() ? `linear-gradient(135deg, ${palette.accent}, ${palette.accent}cc)` : 'rgba(255,255,255,0.08)',
                      color: 'white', cursor: input.trim() ? 'pointer' : 'default',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>↑</button>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'code' && (
              <div style={{ flex: 1, overflow: 'auto', padding: '12px' }}>
                <pre style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', lineHeight: 1.5,
                  color: 'rgba(255,255,255,0.85)', background: 'rgba(0,0,0,0.4)',
                  padding: '16px', borderRadius: '8px', overflow: 'auto', whiteSpace: 'pre-wrap',
                }}>
                  {generateReactCode()}
                </pre>
              </div>
            )}

            {activeTab === 'console' && (
              <div style={{ flex: 1, overflow: 'auto', padding: '12px' }}>
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: '11px',
                  background: 'rgba(0,0,0,0.4)', borderRadius: '8px', padding: '12px',
                }}>
                  {consoleLog.slice(-20).map((entry, i) => (
                    <div key={i} style={{ padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <span style={{
                        color: entry.type === 'error' ? '#ef4444' : entry.type === 'success' ? '#22c55e' : '#6366f1',
                        fontWeight: 600, fontSize: '10px',
                      }}>[{entry.type.toUpperCase()}]</span>
                      <span style={{ color: 'rgba(255,255,255,0.5)', marginLeft: '8px', fontSize: '10px' }}>{entry.time}</span>
                      <div style={{ color: 'rgba(255,255,255,0.7)', marginTop: '2px' }}>{entry.message}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </aside>
        )}

        {/* CANVAS - SCROLLABLE */}
        <main style={{
          flex: 1, background: '#0c0c0c',
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.02) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
          padding: '24px', overflow: 'auto',
        }}>
          <div style={{
            width: viewportSizes[viewport].width,
            maxWidth: viewportSizes[viewport].maxWidth,
            background: design.sections[0]?.background || '#0a0a0a',
            borderRadius: '12px',
            boxShadow: '0 0 0 1px rgba(255,255,255,0.05), 0 25px 60px rgba(0,0,0,0.5)',
            overflow: 'hidden',
            transition: 'all 0.3s ease',
          }}>
            {/* SCROLLABLE CONTENT */}
            <div style={{
              maxHeight: viewport === 'desktop' ? 'none' : viewport === 'tablet' ? '600px' : '667px',
              overflowY: viewport === 'desktop' ? 'visible' : 'auto',
            }}>
              {design.sections.map((section, index) => renderSection(section as SectionType, index))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ThunderEditor;
