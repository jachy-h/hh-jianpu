import React, { useEffect, useRef, useState } from 'react';
import { authorActions, followErrorMessage } from '../adapters/container/author';
import type { AuthorActions } from '../adapters/container/author';
import type { FollowResult } from '../adapters/container';

/** 列表末尾的作者联系入口；只有明确点按才拉起原生关注流程。 */
export const AuthorInvitation: React.FC = () => {
  const [actions, setActions] = useState<AuthorActions | null>(null);
  const [status, setStatus] = useState<FollowResult['follow_status']>(-1);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [showRequest, setShowRequest] = useState(false);
  const busy = useRef(false);
  const generation = useRef(0);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    let disposed = false;
    void authorActions().then(async available => {
      if (disposed) return;
      setActions(available ? () => available : null);
      const query = generation.current;
      const initialStatus = await available?.readStatus();
      if (!disposed && query === generation.current && initialStatus !== undefined) setStatus(initialStatus);
    });
    return () => { disposed = true; mounted.current = false; };
  }, []);

  const handleFollow = async () => {
    if (!actions) { setMessage('请在小红书 9.51 或更新版本中打开工具，或前往作者主页关注。'); return; }
    if (busy.current || status === 1 || status === 2) return;
    busy.current = true;
    generation.current++;
    setPending(true);
    setMessage('');
    try {
      const result = await actions.follow();
      if (!mounted.current) return;
      setStatus(result);
      if (result === -1) setMessage(followErrorMessage(null));
    } catch (error) {
      if (mounted.current) setMessage(followErrorMessage(error));
    } finally {
      busy.current = false;
      if (mounted.current) setPending(false);
    }
  };

  return <aside className="author-invitation" aria-labelledby="author-invitation-title">
    <span className="author-invitation-label">一起添几首好曲子</span>
    <h2 id="author-invitation-title">还想练哪首？</h2>
    <p>关注工具作者，留意后续曲谱更新。也欢迎把想练的曲名告诉作者。</p>
    <div className="author-invitation-actions">
      {<button type="button" className="author-follow" disabled={pending || status === 1 || status === 2} onClick={() => { void handleFollow(); }}>
        {pending ? '等待确认…' : status === 1 ? '已关注作者' : status === 2 ? '你是工具作者' : '关注作者'}
      </button>}
      <button type="button" className="author-request" aria-expanded={showRequest} aria-controls="author-request-guide" onClick={() => setShowRequest(value => !value)}>有谱吗？ <span aria-hidden="true">{showRequest ? '−' : '+'}</span></button>
    </div>
    {!actions && <p className="author-invitation-hint">可在小红书打开工具作者主页，关注作者或发送私信。</p>}
    {showRequest && <div id="author-request-guide" className="author-request-guide">
      <p>没有我想练的谱，私信作者，叫他起来加曲谱啦！</p>
      <p>这里不会发送消息，私信入口以作者主页实际显示为准。</p>
    </div>}
    <p className="author-invitation-message" role="status">{message || (status === 1 ? '感谢关注，愿每次练习都有新收获。' : '')}</p>
  </aside>;
};
