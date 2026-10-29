import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import TopBar from '../components/Layout/TopBar';
import SymbolReference from '../components/Help/SymbolReference';
import { HELP_PAGE_VERSION, HELP_PAGE_UPDATED_DATE } from '../config';

const SECTIONS = [
  { id: 'start', title: '先试一首', hint: '第一次使用，从这里开始' },
  { id: 'write', title: '怎么写谱', hint: '音符、节奏和歌词' },
  { id: 'practice', title: '怎么练习', hint: '慢放、循环和移调' },
  { id: 'save', title: '保存与备份', hint: '留住曲谱，换设备也能用' },
  { id: 'faq', title: '遇到问题', hint: '声音、拍数和显示' },
  { id: 'symbols', title: '符号速查', hint: '完整释义与键盘位置' },
] as const;

const FIRST_SCORE = `---
标题: 小星星
速度: 80
---
Q 1 1 5 5 | 6 6 5 - |
C 一 闪 一 闪 亮 晶 晶
Q 4 4 3 3 | 2 2 1 - |
C 满 天 都 是 小 星 星`;

interface ExampleProps {
  readonly children: string;
  readonly label?: string;
}

const Example: React.FC<ExampleProps> = ({ children, label = '输入示例' }) => (
  <div className="my-4 min-w-0 overflow-hidden rounded-xl border border-barline bg-paper">
    <p className="border-b border-barline px-4 py-2 text-xs text-stone-500">{label}</p>
    <pre className="overflow-x-auto p-4 font-mono text-sm leading-7 text-ink"><code>{children}</code></pre>
  </div>
);

interface FoldProps {
  readonly title: string;
  readonly children: React.ReactNode;
}

const Fold: React.FC<FoldProps> = ({ title, children }) => (
  <details className="group border-b border-barline last:border-b-0">
    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-medium text-ink [&::-webkit-details-marker]:hidden">
      {title}
      <svg aria-hidden="true" className="h-4 w-4 shrink-0 text-stone-400 transition-transform group-open:rotate-180" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m5 7 5 5 5-5" /></svg>
    </summary>
    <div className="space-y-3 pb-5 text-sm leading-7 text-stone-600">{children}</div>
  </details>
);

interface WritingRow {
  readonly title: string;
  readonly code: string;
  readonly meaning: string;
}

const BASIC_WRITING: readonly WritingRow[] = [
  { title: '写音符', code: '1 2 3 4 5 6 7', meaning: '哆、来、咪、发、嗦、啦、西' },
  { title: '停一拍', code: '0', meaning: '休止符，这一拍不发声' },
  { title: '分小节', code: '1 2 3 4 |', meaning: '用 | 隔开小节，4/4 拍每小节凑满 4 拍' },
  { title: '唱长一点', code: '1 -', meaning: '共 2 拍；每多一个 -，再延长 1 拍' },
  { title: '唱短一点', code: '1/ 2/', meaning: '每个音半拍；1// 是四分之一拍' },
  { title: '加附点', code: '1.', meaning: '唱 1 拍半；点写在数字后面' },
  { title: '高八度', code: "1'", meaning: '数字后加英文单引号' },
  { title: '低八度', code: '1,', meaning: '数字后加英文逗号，注意不是句号' },
];

const HelpPage: React.FC = () => {
  const [activeSection, setActiveSection] = useState<string>('start');
  const [copyStatus, setCopyStatus] = useState('');
  const mainRef = useRef<HTMLElement>(null);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const copyResetRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => clearTimeout(copyResetRef.current), []);

  const handleScroll = () => {
    const main = mainRef.current;
    if (!main) return;
    // 到达页尾时也要选中最后一节，兼容大屏上无法滚到顶部的短章节。
    if (main.scrollHeight - main.scrollTop - main.clientHeight <= 8) {
      setActiveSection('symbols');
      return;
    }
    const readingLine = main.getBoundingClientRect().top + Math.min(160, main.clientHeight / 4);
    const current = [...SECTIONS].reverse().find(section => {
      const node = sectionRefs.current[section.id];
      return node && node.getBoundingClientRect().top <= readingLine;
    });
    setActiveSection(current?.id ?? 'start');
  };

  const handleNavigate = (id: string) => {
    setActiveSection(id);
    sectionRefs.current[id]?.scrollIntoView({ block: 'start' });
    sectionRefs.current[id]?.focus({ preventScroll: true });
  };

  const handleCopy = async () => {
    clearTimeout(copyResetRef.current);
    try {
      await navigator.clipboard.writeText(FIRST_SCORE);
      setCopyStatus('已复制，粘贴到编辑器就能试试');
    } catch {
      setCopyStatus('未能复制，请选中下方示例文字手动复制');
    }
    copyResetRef.current = setTimeout(() => setCopyStatus(''), 5000);
  };

  const sectionProps = (id: string) => ({
    id,
    ref: (node: HTMLElement | null) => { sectionRefs.current[id] = node; },
    tabIndex: -1,
    className: 'scroll-mt-6 outline-none',
  });

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-paper text-ink">
      <TopBar backTo="/" backLabel="首页" subtitle={<span className="hidden text-sm text-stone-500 sm:inline">/ 使用帮助</span>} />
      <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col md:flex-row">
        <aside className="shrink-0 border-b border-barline md:w-56 md:overflow-y-auto md:border-b-0 md:border-r">
          <div className="px-6 pb-5 pt-10 hidden md:block">
            <p className="font-serif text-xl font-semibold">简谱小手册</p>
            <p className="mt-2 text-xs text-stone-500">从写下第一个音开始</p>
          </div>
          <nav aria-label="帮助目录" className="grid grid-cols-3 gap-1 p-2 md:flex md:flex-col md:px-3">
            {SECTIONS.map((section, index) => (
              <button key={section.id} type="button" onClick={() => handleNavigate(section.id)} aria-current={activeSection === section.id ? 'location' : undefined}
                className={`shrink-0 rounded-lg px-3 py-3 text-left text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-highlight ${activeSection === section.id ? 'bg-blue-50 font-semibold text-blue-700' : 'text-stone-600 hover:bg-stone-100 hover:text-ink'}`}>
                <span className="mr-2 hidden font-mono text-xs opacity-60 md:inline">0{index + 1}</span>{section.title}
                <span className="ml-6 mt-1 hidden text-xs font-normal text-stone-500 md:block">{section.hint}</span>
              </button>
            ))}
          </nav>
        </aside>

        <main ref={mainRef} onScroll={handleScroll} className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="mx-auto max-w-3xl px-5 py-8 sm:px-10 sm:py-12">
            <header className="mb-7 sm:mb-10">
              <p className="mb-3 text-xs font-medium tracking-widest text-blue-700">写谱 · 听谱 · 练习</p>
              <h1 className="font-serif text-3xl font-semibold leading-tight sm:text-4xl">把数字，变成旋律。</h1>
              <p className="mt-4 text-sm leading-7 text-stone-600">不用先学会所有符号。跟着下面三步，就能听到第一段旋律。</p>
            </header>

            <div className="space-y-12 sm:space-y-16">
              <section {...sectionProps('start')} aria-labelledby="start-title">
                <h2 id="start-title" className="text-xl font-semibold">01 <span className="ml-2">先试一首</span></h2>
                <ol className="my-6 grid gap-4 sm:grid-cols-3 sm:gap-5">
                  {[
                    ['打开曲谱', '回到首页，点击“新建曲谱”，或选一首示例。'],
                    ['输入数字', '把下方示例复制到编辑器，曲谱会自动显示。'],
                    ['点击播放', '点击底部的播放按钮，听听你写的旋律。'],
                  ].map(([title, description], index) => (
                    <li key={title} className="relative pl-7 sm:border-t-2 sm:border-barline sm:pl-0 sm:pt-3">
                      <span className="absolute left-0 top-0 font-mono text-sm text-stone-400 sm:static sm:text-xs">0{index + 1}</span>
                      <h3 className="mb-1 text-sm font-semibold sm:mt-1">{title}</h3>
                      <p className="text-sm leading-6 text-stone-600">{description}</p>
                    </li>
                  ))}
                </ol>
                <div className="overflow-hidden rounded-xl border border-barline bg-white">
                  <div className="flex items-center justify-between gap-3 border-b border-barline px-4 py-3">
                    <span className="text-sm font-medium">试写《小星星》</span>
                    <button type="button" onClick={handleCopy} className="rounded-md bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 hover:bg-blue-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-highlight">复制示例</button>
                  </div>
                  <pre className="overflow-x-auto px-5 py-4 font-mono text-sm leading-7"><code>{FIRST_SCORE}</code></pre>
                </div>
                <p role="status" className="mt-2 min-h-5 text-xs text-blue-700">{copyStatus}</p>
                <p className="mt-1 text-sm leading-7 text-stone-600">数字是音符，<code>|</code> 是小节线，<code>-</code> 让前一个音多唱一拍。<br />以 <code>C</code> 开头的行是歌词，不想写歌词时可以省略。</p>
                <Link to="/" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:underline">去首页试试 <span aria-hidden="true">→</span></Link>
              </section>

              <section {...sectionProps('write')} aria-labelledby="write-title">
                <h2 id="write-title" className="text-xl font-semibold">02 <span className="ml-2">怎么写谱</span></h2>
                <p className="mb-5 mt-3 text-sm leading-7 text-stone-600">先记住这些常用写法。符号用英文输入，音符之间留空格。</p>
                <div className="overflow-hidden rounded-xl border border-barline bg-white">
                  <div className="hidden grid-cols-[7rem_10rem_1fr] gap-3 border-b border-barline bg-stone-50 px-4 py-3 text-xs text-stone-500 lg:grid"><span>想要</span><span>这样写</span><span>含义</span></div>
                  <dl className="divide-y divide-stone-100">
                    {BASIC_WRITING.map(row => (
                      <div key={row.title} className="grid grid-cols-[1fr_auto] items-baseline gap-x-3 gap-y-1 px-4 py-3 lg:grid-cols-[7rem_10rem_1fr]">
                        <dt className="text-sm font-medium">{row.title}</dt>
                        <dd className="font-mono text-sm text-blue-700">{row.code}</dd>
                        <dd className="col-span-2 text-xs leading-6 text-stone-600 lg:col-span-1">{row.meaning}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
                <p className="mt-3 text-xs leading-6 text-stone-500">上面的拍数以 4/4 拍为例。不写调号、拍号和速度时，默认 C 调、4/4 拍、速度 120。</p>
                <h3 className="mb-1 mt-8 text-sm font-semibold">需要时，再学这些</h3>
                <div>
                  <Fold title="写歌词">
                    <p>旋律行以 Q 开头，歌词行以 C 开头。一字对一个音，空格方便阅读。</p>
                    <Example>{'Q 1 2 3 4 |\nC 我 的 歌 声'}</Example>
                    <p>一个音唱多个字，用括号：<code>C (我们) 的 歌 声</code>。某个音不唱词，用 <code>_</code> 占位。</p>
                    <p>同一旋律配多段歌词时，用 <code>C</code> 写第一段、<code>C2</code> 写第二段、<code>C3</code> 写第三段（最多 99 段）。各段从曲首独立对齐，显示在旋律下方；双声部可用 <code>C2[upper]</code> 和 <code>C2[lower]</code>。</p>
                    <p>休止符、延长线、换气和倚音不用配歌词。同一段号的多行歌词会从曲首依次分配，不会在每行旋律下重新开始；多出的词不显示，词少了则后面的音不配词。</p>
                  </Fold>
                  <Fold title="改标题、调号、拍号和速度">
                    <p>把下面这段放在曲谱最前面，修改冒号后的内容。开头和结尾的三条短横线都要保留。</p>
                    <Example>{'---\n标题: 我的曲谱\n调号: C\n拍号: 4/4\n速度: 80\n---'}</Example>
                    <p>速度数字越小，播放越慢。也可添加“作曲”等信息；基础字段兼容 title、key、time、tempo。</p>
                    <p>6/8 拍中，<code>1/</code> 占一拍，<code>1</code> 占两拍。速度始终按每分钟四分音符数计算。</p>
                    <p>需要注释时，在这两个 <code>---</code> 之间单独写一行，以 <code>#</code> 或 <code>//</code> 开头。音符行内不能写注释。</p>
                  </Fold>
                  <Fold title="升降音、连线和演奏符号">
                    <p><code>#4</code> 升半音，<code>b7</code> 降半音。升降号在前，八度在后，例如 <code>#4'</code>。</p>
                    <Example>{"#4 5 b7 1' |\n(1 2 3) 4 |\n1/2/ 3/4/ 5 6 |"}</Example>
                    <p><code>(1 2 3)</code> 用圆滑线连起音符，可跨小节；括号要成对，嵌套时只处理最外层。<code>1/2/</code> 不留空格时，减时线相连；<code>1/ 2/</code> 留空格时各自独立。</p>
                    <ul className="list-disc space-y-1 pl-5">
                      <li><code>v</code> 或 <code>V</code>：换气，不占拍，可写在小节线旁。</li>
                      <li><code>5!</code>：短顿音，占拍不变，发声更短（原时长的四分之一）。</li>
                      <li><code>^3/ 5</code>：在 5 前加倚音 3；倚音必须带 / 或 //，从主音借时。</li>
                      <li><code>~1</code> 单波音、<code>~~2</code> 复波音、<code>~.3</code> 下波音，占拍不变。</li>
                      <li><code>||</code>：结束线。</li>
                    </ul>
                    <p>短顿音暂不能与倚音、波音、圆滑线或延长线组合。最多支持两条减时线、一个附点；<code>_</code> 只用于歌词占位。</p>
                  </Fold>
                  <Fold title="让一段旋律演奏两遍">
                    <p>把要重复的部分放在 <code>||:</code> 和 <code>:||</code> 之间。</p>
                    <Example>{"||: 1 2 3 4 | 5 6 7 1' :|| 1' - - - |"}</Example>
                    <p>播放顺序：第 1、2 小节 → 再奏第 1、2 小节 → 第 3 小节。只有 <code>:||</code> 时，从曲首重复一次。</p>
                    <p>可写多段顺序反复；相邻段可用 <code>:||:</code> 连接。<code>||:</code> 自身就划分小节，前面不必再加 <code>|</code>。前反复须有后反复，双声部须在对应位置写相同记号。</p>
                    <p>暂不支持嵌套反复、空反复段、跳房子、指定次数和 D.C./D.S.。选段循环会按书写顺序播放，忽略选段内的反复。</p>
                  </Fold>
                  <Fold title="同时写旋律和伴奏（双声部）">
                    <p>也可以从首页的“上下双声部”示例开始。上行写旋律，下行写伴奏，两行同时播放。</p>
                    <Example>{"Q[upper] 3/5/ 7/1'/ 1' - |\nQ[lower] 1 0 0 1 |"}</Example>
                    <p>两行小节数要一致，每小节各自凑满拍数。4/4 拍中，整小节不演奏就写 <code>0 0 0 0 |</code>。</p>
                    <p>歌词分别用 <code>C[upper]</code> 和 <code>C[lower]</code>，按各自声部从头分配。后续旋律行也要注明声部；普通 Q 行按先后顺序演奏，不会自动变成双声部。</p>
                    <p>底部播放条可分别静音旋律或伴奏。目前支持两个单音声部，暂不支持和弦、琶音或第三声部。</p>
                  </Fold>
                </div>
              </section>

              <section {...sectionProps('practice')} aria-labelledby="practice-title">
                <h2 id="practice-title" className="text-xl font-semibold">03 <span className="ml-2">怎么练习</span></h2>
                <p className="mb-5 mt-3 text-sm leading-7 text-stone-600">打开一首曲谱，在底部播放条调整。竹笛新手可以从首页“竹笛入门”的练习曲开始。</p>
                <dl className="divide-y divide-barline text-sm">
                  {[
                    ['慢一点练', '把练习速度调到 0.5×，熟悉后再加速。可选 0.5×～2×，不改变原谱速度。'],
                    ['留时间准备', '播放前选择 4、8 或 16 拍预备拍；选 0 拍则直接开始。'],
                    ['反复练一段', '在预览中先点起点小节 A，再点终点小节 B。两端小节都会循环播放；清除选段后恢复全曲。'],
                    ['暂停或重来', '暂停后可接着播放，停止后回到开头。光标不在编辑器内时，也可按空格播放或暂停。'],
                    ['看得更清楚', '在播放条调整字号。手动滚动后，点击“恢复播放跟随”继续自动跟谱。'],
                  ].map(([title, text]) => (
                    <div key={title} className="grid gap-1 py-4 sm:grid-cols-[7rem_1fr] sm:gap-4"><dt className="font-medium">{title}</dt><dd className="leading-7 text-stone-600">{text}</dd></div>
                  ))}
                </dl>
                <Fold title="换音色、移调和竹笛指法">
                  <p>默认使用“原声（合成音）”。“钢琴”暂时停用，保留在音色列表中但不可选择。</p>
                  <p>在编辑器打开移调，选择目标调号或筒音指法，核对结果后应用。移调会改变实际播放音高，双声部一起调整。</p>
                  <p>移调会整理谱文格式，不保留注释原文；想留原稿时，先下载一份。</p>
                </Fold>
              </section>

              <section {...sectionProps('save')} aria-labelledby="save-title">
                <h2 id="save-title" className="text-xl font-semibold">04 <span className="ml-2">保存与备份</span></h2>
                <div className="mb-5 mt-5 rounded-xl border border-blue-100 bg-blue-50 px-5 py-4 text-sm leading-7">
                  <p className="font-medium">自动保存到当前浏览器，离开前确认“浏览器已保存”。</p>
                  <p className="mt-1 text-stone-600">编辑公共示例会创建个人副本。清理浏览器网站数据可能丢失曲谱，记得下载备份。</p>
                </div>
                <ol className="list-decimal space-y-3 pl-5 text-sm leading-7 text-stone-600">
                  <li><strong className="font-medium text-ink">留一首：</strong>在首页个人曲谱中点击“下载”。</li>
                  <li><strong className="font-medium text-ink">备份全部：</strong>点击“下载全部曲谱”，保存好下载的文件。</li>
                  <li><strong className="font-medium text-ink">换设备：</strong>把备份文件传到新设备，在首页点击“导入曲谱”，在弹窗中选择文件或直接拖入文件。</li>
                </ol>
                <p className="my-4 text-xs leading-6 text-stone-500">下载的是可再次编辑的 JSONC 曲谱文件；导入支持 JSON、JSONC 和曲谱备份包。</p>
                <Fold title="本地文件夹备份与保存失败">
                  <p>支持的浏览器可通过“更改存储位置”选择本地文件夹。浏览器自动保存和文件夹备份各有状态：“浏览器已保存”不代表“目录备份已同步”。</p>
                  <p>浏览器保存失败，点击“重试保存”；目录备份失败，按提示重试或重新授权。不支持目录选择时，可以下载文件备份。</p>
                  <p>重复导入相同曲谱会跳过；同一曲谱内容不同时，保留原谱并新增导入副本。文件夹与浏览器发生冲突时，会保留较旧内容为“冲突副本”，可核对后整理。</p>
                </Fold>
              </section>

              <section {...sectionProps('faq')} aria-labelledby="faq-title">
                <h2 id="faq-title" className="mb-3 text-xl font-semibold">05 <span className="ml-2">遇到问题</span></h2>
                <Fold title="点击播放，为什么没有声音？">
                  <p>先检查设备和浏览器音量，以及声部是否静音。如果编辑器提示错误，先按提示修正再播放。</p>
                  <p>当前使用无需下载钢琴采样的“原声（合成音）”；钢琴音色暂时停用。</p>
                </Fold>
                <Fold title="提示“小节拍数不对”，怎么改？">
                  <p>先看拍号。4/4 拍每小节需要 4 拍：<code>1 2 3 4 |</code> 或 <code>1 2 3 - |</code> 都可以。</p>
                  <p><code>1</code> 是 1 拍，<code>1/</code> 是半拍，<code>1.</code> 是 1 拍半。6/8 拍时，<code>1</code> 占两拍，<code>1/</code> 占一拍。</p>
                  <p>按错误提示找到对应小节，再补齐或删去多余的拍数。预览可能只显示已识别的部分，修正后再练习。</p>
                </Fold>
                <Fold title="想写低音，为什么变成了长音？">
                  <p>低八度用英文逗号 <code>1,</code>。句号 <code>1.</code> 是附点，会让声音延长一半。</p>
                </Fold>
                <Fold title="歌词没有对上音符？">
                  <p>歌词从第一个发声音符开始依次对应。没有词的音符用 <code>_</code> 占位，休止符和延长线不用占位。</p>
                  <p>同一段号换行不会重新起算；另起一段请用 C2、C3。一个音对应多个字时，把这些字放在括号中。</p>
                </Fold>
                <Fold title="怎么控制曲谱换行？">
                  <p>在谱文的小节之间按回车，预览会尽量按你的换行显示。屏幕放不下时会自动在小节之间换行；单个小节过宽时可以横向滚动。</p>
                </Fold>
                <Fold title="能拍照或上传图片识谱吗？">
                  <p>图片识谱暂未开放。可以手动输入，或在首页导入 JSON / JSONC 曲谱文件。</p>
                </Fold>
              </section>
              <section {...sectionProps('symbols')} aria-labelledby="symbols-title">
                <h2 id="symbols-title" className="text-xl font-semibold">06 <span className="ml-2">符号速查</span></h2>
                <SymbolReference scrollContainerRef={mainRef} />
              </section>
            </div>
            <footer className="mt-12 border-t border-barline pt-5 text-xs leading-6 text-stone-500">使用帮助 {HELP_PAGE_VERSION} · 更新于 {HELP_PAGE_UPDATED_DATE}</footer>
          </div>
        </main>
      </div>
    </div>
  );
};

export default HelpPage;
