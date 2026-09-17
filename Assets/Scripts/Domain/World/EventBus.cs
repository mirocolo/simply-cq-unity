using System;
using System.Collections.Generic;

namespace SimplyCQ.Domain
{
    public interface IEventBus
    {
        void Subscribe<T>(Action<T> handler) where T : struct;
        void Unsubscribe<T>(Action<T> handler) where T : struct;
        void Publish<T>(T evt) where T : struct;
        void Clear();
    }

    /// <summary>极简类型化事件总线：逻辑层发事件，表现层（视图/UI/音效）订阅。逻辑层永远不反向依赖表现层。</summary>
    public sealed class EventBus : IEventBus
    {
        private readonly Dictionary<Type, Delegate> _handlers = new Dictionary<Type, Delegate>();

        public void Subscribe<T>(Action<T> handler) where T : struct
        {
            if (handler == null) return;
            Type t = typeof(T);
            Delegate existing;
            _handlers[t] = _handlers.TryGetValue(t, out existing) ? Delegate.Combine(existing, handler) : handler;
        }

        public void Unsubscribe<T>(Action<T> handler) where T : struct
        {
            if (handler == null) return;
            Type t = typeof(T);
            Delegate existing;
            if (!_handlers.TryGetValue(t, out existing)) return;
            Delegate left = Delegate.Remove(existing, handler);
            if (left == null) _handlers.Remove(t);
            else _handlers[t] = left;
        }

        public void Publish<T>(T evt) where T : struct
        {
            Delegate d;
            if (!_handlers.TryGetValue(typeof(T), out d)) return;
            Action<T> action = d as Action<T>;
            if (action != null) action.Invoke(evt);
        }

        public void Clear() { _handlers.Clear(); }
    }
}
