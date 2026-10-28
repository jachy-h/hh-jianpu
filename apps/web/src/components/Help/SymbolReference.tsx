import React, { useLayoutEffect, useRef, useState } from 'react';
import { calculateKeyboardScrollTransform } from './keyboard-scroll';
import { getSymbolKeyStrokes, KEYBOARD_ROWS, SYMBOL_GROUPS, type ReferenceSymbol } from './symbol-reference-data';

interface ReferenceKeyboardProps {
  readonly activeSymbol: ReferenceSymbol;
}

const ReferenceKeyboard: React.FC<ReferenceKeyboardProps> = ({ activeSymbol }) => {
  const strokes = getSymbolKeyStrokes(activeSymbol.input);
  const activeCodes = new Set(strokes.map(stroke => stroke.code));
  if (strokes.some(stroke => stroke.shift)) activeCodes.add('ShiftLeft');

  return (
    <>
      <div className="rounded-xl border border-barline bg-stone-100 p-2 shadow-sm sm:p-4">
        <div className="mb-3 flex items-center justify-between gap-2 text-xs">
          <span className="font-medium text-ink">输入键位</span>
          <span className="text-stone-500">英文输入 · 美式键盘</span>
        </div>
        <div aria-hidden="true" className="space-y-1">
          {KEYBOARD_ROWS.map((row, index) => (
            <div key={index} className="grid grid-cols-[repeat(30,minmax(0,1fr))] gap-0.5 sm:gap-1">
              {row.map(key => (
                <kbd key={key.code} data-key-code={key.code} data-highlighted={activeCodes.has(key.code)}
                  className={`${key.width ?? 'col-span-2'} flex h-8 min-w-0 flex-col items-center justify-center rounded border border-b-2 font-mono text-[9px] transition-colors sm:h-10 sm:text-xs ${activeCodes.has(key.code) ? 'border-blue-700 bg-highlight text-white' : 'border-stone-300 bg-white text-stone-600'}`}>
                  {key.shifted && <span className={`text-[8px] leading-3 sm:text-[10px] ${activeCodes.has(key.code) ? 'text-blue-100' : 'text-stone-400'}`}>{key.shifted}</span>}
                  <span className="leading-3 sm:leading-4">{key.label}</span>
                </kbd>
              ))}
            </div>
          ))}
        </div>
        <div className="mt-3 border-t border-stone-200 pt-2" aria-live="polite" aria-atomic="true">
          <p className="text-xs font-medium text-ink"><code className="mr-2 font-mono text-blue-700">{activeSymbol.symbol}</code>{activeSymbol.name}</p>
          <div className="mt-1 h-14 overflow-y-auto text-xs leading-5 text-stone-600">
            {activeSymbol.tip ? <p>{activeSymbol.tip}</p> : (
              <div className="flex items-center gap-1 overflow-x-auto whitespace-nowrap pb-1" aria-label="按键输入顺序">
                {strokes.map((stroke, index) => {
                  const key = KEYBOARD_ROWS.flat().find(item => item.code === stroke.code);
                  return (
                    <React.Fragment key={index}>
                      {index > 0 && <span className="px-0.5 text-stone-400" aria-label="然后">→</span>}
                      <span className="rounded border border-barline bg-white px-1.5 py-0.5 font-mono">{stroke.shift ? 'Shift + ' : ''}{key?.label === '↵' ? 'Enter' : key?.label}</span>
                    </React.Fragment>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
      <p className="mt-2 text-[11px] leading-5 text-stone-500">蓝色是会用到的键；组合写法依次输入，只有 Shift 和它后面的键同时按。</p>
    </>
  );
};

interface SymbolReferenceProps {
  readonly scrollContainerRef: React.RefObject<HTMLElement>;
}

interface KeyboardLayout {
  readonly height: number;
  readonly progress: number;
  readonly style: React.CSSProperties;
}

const SymbolReference: React.FC<SymbolReferenceProps> = ({ scrollContainerRef }) => {
  const [activeSymbol, setActiveSymbol] = useState<ReferenceSymbol>(SYMBOL_GROUPS[2].symbols[0]);
  const [keyboardLayout, setKeyboardLayout] = useState<KeyboardLayout>({ height: 0, progress: 0, style: {} });
  const referenceRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const keyboardRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const scroller = scrollContainerRef.current;
    const anchor = anchorRef.current;
    const keyboard = keyboardRef.current;
    const reference = referenceRef.current;
    if (!scroller || !anchor || !keyboard || !reference) return;
    let frame = 0;

    const updateLayout = () => {
      frame = 0;
      const anchorRect = anchor.getBoundingClientRect();
      const mainTop = scroller.getBoundingClientRect().top;
      const referenceBottom = reference.getBoundingClientRect().bottom;
      // offsetHeight 不受 transform 缩放影响，用来保留原始占位，避免正文跳动。
      const height = keyboard.offsetHeight;
      const { progress, scale, translateX } = calculateKeyboardScrollTransform({
        distancePastTop: mainTop - anchorRect.top,
        keyboardWidth: anchorRect.width,
        availableRightWidth: window.innerWidth - anchorRect.right - 32,
        isDesktop: window.matchMedia('(min-width: 1024px)').matches,
      });
      const isPinned = anchorRect.top <= mainTop && referenceBottom > mainTop;
      const style: React.CSSProperties = isPinned ? {
        position: 'fixed',
        left: anchorRect.left,
        top: Math.min(mainTop, referenceBottom - height * scale),
        width: anchorRect.width,
        transform: `translate3d(${translateX}px, 0, 0) scale(${scale})`,
      } : {};
      setKeyboardLayout(previous => previous.height === height && previous.progress === progress
        && JSON.stringify(previous.style) === JSON.stringify(style) ? previous : { height, progress, style });
    };

    const handleLayoutChange = () => {
      if (!frame) frame = requestAnimationFrame(updateLayout);
    };
    updateLayout();
    const observer = new ResizeObserver(handleLayoutChange);
    observer.observe(anchor);
    observer.observe(keyboard);
    scroller.addEventListener('scroll', handleLayoutChange, { passive: true });
    window.addEventListener('resize', handleLayoutChange);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      scroller.removeEventListener('scroll', handleLayoutChange);
      window.removeEventListener('resize', handleLayoutChange);
    };
  }, [scrollContainerRef]);

  return (
    <div ref={referenceRef} className="relative">
      <p className="mb-5 mt-3 text-sm leading-7 text-stone-600">悬停某一行，查看符号在哪个键上。也可以用 Tab 聚焦符号，或直接点选。</p>
      <div ref={anchorRef} className="relative -mx-1" style={keyboardLayout.height ? { height: keyboardLayout.height } : undefined}>
        <div ref={keyboardRef} data-symbol-keyboard data-scroll-progress={keyboardLayout.progress}
          className="relative z-20 origin-top-left bg-paper px-1 pb-4 pt-2" style={keyboardLayout.style}>
          <ReferenceKeyboard activeSymbol={activeSymbol} />
        </div>
      </div>

      <table className="w-full table-fixed border-collapse text-left text-sm">
        <caption className="sr-only">完整符号释义。悬停、聚焦或点选符号，可在键盘示意中查看输入位置。拍数以 4/4 拍为例。</caption>
        <thead>
          <tr className="border-b border-barline text-xs text-stone-500">
            <th scope="col" className="w-[31%] px-2 py-3 font-normal sm:w-[23%]">符号</th>
            <th scope="col" className="px-2 py-3 font-normal">释义</th>
            <th scope="col" className="hidden w-[29%] px-2 py-3 font-normal sm:table-cell">示例</th>
          </tr>
        </thead>
        {SYMBOL_GROUPS.map(group => (
          <tbody key={group.title}>
            <tr>
              <th scope="colgroup" colSpan={2} className="border-b border-barline bg-stone-100 px-3 py-3 text-xs font-semibold text-stone-600 sm:hidden">{group.title}</th>
              <th scope="colgroup" colSpan={3} className="hidden border-b border-barline bg-stone-100 px-3 py-3 text-xs font-semibold text-stone-600 sm:table-cell">{group.title}</th>
            </tr>
            {group.symbols.map(symbol => {
              const isActive = activeSymbol === symbol;
              return (
                <tr key={symbol.symbol} onMouseEnter={() => setActiveSymbol(symbol)} className={`border-b border-stone-200 transition-colors ${isActive ? 'bg-blue-50' : 'hover:bg-white'}`}>
                  <th scope="row" className="px-2 py-3 align-top font-normal">
                    <button type="button" onFocus={() => setActiveSymbol(symbol)} onClick={() => setActiveSymbol(symbol)} aria-pressed={isActive} aria-label={`${symbol.symbol}：${symbol.name}，查看键位`}
                      className={`max-w-full ${keyboardLayout.progress === 1 ? 'lg:scroll-mt-6 scroll-mt-96' : 'scroll-mt-96'} break-all rounded px-1 py-1 text-left font-mono text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-highlight sm:text-sm ${isActive ? 'font-semibold text-blue-700' : 'text-ink'}`}>
                      {symbol.symbol}
                    </button>
                  </th>
                  <td className="px-2 py-3 align-top text-xs leading-6 sm:text-sm">
                    <p className="font-medium text-ink">{symbol.name}</p>
                    <p className="text-stone-600">{symbol.description}</p>
                    <code className="mt-1 block whitespace-pre-wrap break-all font-mono text-blue-700 sm:hidden">{symbol.example}</code>
                  </td>
                  <td className="hidden px-2 py-4 align-top sm:table-cell"><code className="whitespace-pre-wrap break-all font-mono text-xs leading-6 text-stone-600">{symbol.example}</code></td>
                </tr>
              );
            })}
          </tbody>
        ))}
      </table>
      <div className="mt-5 space-y-2 text-xs leading-6 text-stone-500">
        <p>拍数以 4/4 拍为例。6/8 拍中，一个普通数字占两拍；速度始终按每分钟四分音符数计算。</p>
        <p>兼容旧写法：前置高八度 '1、前置低八度 .1，以及减时线后的八度 5/,。新谱建议使用后置八度 1'、1,。</p>
        <p>最多支持两条减时线、一个附点。短顿音不能与倚音、波音、圆滑线或延长线组合。反复暂不支持嵌套、跳房子或指定次数。</p>
      </div>
    </div>
  );
};

export default SymbolReference;
