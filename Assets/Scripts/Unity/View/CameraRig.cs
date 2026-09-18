using UnityEngine;

namespace SimplyCQ.Unity
{
    /// <summary>相机跟随 + 地图边界夹取。普通类而不是 MonoBehaviour，避免脚本执行顺序问题。</summary>
    public sealed class CameraRig
    {
        private readonly Camera _camera;
        private readonly Transform _target;
        private Rect _bounds;
        private readonly float _smoothTime;
        private float _velocityX;
        private float _velocityY;

        /// <summary>平滑后的"基准位置"（不含抖动）。抖动必须加在它之外，绝不能喂回平滑。</summary>
        private Vector3 _basePos;

        private float _shakeAmount;
        private float _shakeLeft;
        private float _shakeDuration;

        public CameraRig(Camera camera, Transform target, Rect mapBounds, float smoothTime)
        {
            _camera = camera;
            _target = target;
            _bounds = mapBounds;
            _smoothTime = Mathf.Max(0.001f, smoothTime);
            _basePos = target != null ? target.position : Vector3.zero;
        }

        /// <summary>
        /// 震一下。暴击、自己挨打、死亡时用 —— 打击感有一半来自"画面被撞到了"。
        /// 多次触发取较强的那个，不叠乘（连着暴击时画面乱抖反而看不清）。
        /// </summary>
        public void Shake(float amount, float seconds)
        {
            if (amount <= 0f || seconds <= 0f) return;
            // 已经震得更狠就保持，弱的那次不打断
            if (_shakeLeft > 0f && _shakeAmount > amount) return;

            _shakeAmount = amount;
            _shakeDuration = Mathf.Max(0.01f, seconds);
            _shakeLeft = _shakeDuration;
        }

        /// <summary>当前抖动强度 0~1 —— 冒烟自检用它验证"震完会自己回到 0"。</summary>
        public float ShakeLevel { get { return _shakeDuration <= 0f ? 0f : Mathf.Clamp01(_shakeLeft / _shakeDuration) * _shakeAmount / 0.25f; } }

        /// <summary>换图后必须重新给边界，否则相机会拿旧图的尺寸夹取。</summary>
        public void SetBounds(Rect mapBounds)
        {
            _bounds = mapBounds;
        }

        /// <summary>
        /// 立刻咬合到目标位置。换图/读档时用 —— 平滑跟会长距离飞行，
        /// 看起来像是"从上一张图一路飘过去"。
        /// </summary>
        public void Snap()
        {
            if (_camera == null || _target == null) return;

            _velocityX = 0f;
            _velocityY = 0f;

            Vector3 desired = _target.position;
            desired.z = _camera.transform.position.z;
            _basePos = ClampToBounds(desired);
            _shakeLeft = 0f;
            _camera.transform.position = _basePos;
        }

        public void Update(float dt)
        {
            if (_camera == null || _target == null) return;

            Vector3 desired = _target.position;
            desired.z = _camera.transform.position.z;

            float x = Mathf.SmoothDamp(_basePos.x, desired.x, ref _velocityX, _smoothTime, Mathf.Infinity, dt);
            float y = Mathf.SmoothDamp(_basePos.y, desired.y, ref _velocityY, _smoothTime, Mathf.Infinity, dt);
            _basePos = ClampToBounds(new Vector3(x, y, desired.z));

            _camera.transform.position = _basePos + ShakeOffset(dt);
        }

        /// <summary>
        /// 抖动偏移。用逐帧递减 + 随机方向，而不是"随机几秒内乱跳" ——
        /// 后者在帧率不稳时看起来会抽。抖动只加在最终位置上，_basePos 不受影响，所以不会漂。
        /// </summary>
        private Vector3 ShakeOffset(float dt)
        {
            if (_shakeLeft <= 0f) return Vector3.zero;

            _shakeLeft -= dt;
            if (_shakeLeft <= 0f)
            {
                _shakeLeft = 0f;
                _shakeAmount = 0f;
                return Vector3.zero;
            }

            float k = _shakeLeft / _shakeDuration;      // 1 -> 0
            float amp = _shakeAmount * k * k;           // 二次衰减：一开始明显，收得干脆
            return new Vector3(Random.Range(-amp, amp), Random.Range(-amp, amp), 0f);
        }

        /// <summary>地图比屏幕小的时候直接居中，不然会来回抖。</summary>
        private Vector3 ClampToBounds(Vector3 p)
        {
            float halfH = _camera.orthographicSize;
            float halfW = halfH * _camera.aspect;

            float minX = _bounds.xMin + halfW;
            float maxX = _bounds.xMax - halfW;
            float minY = _bounds.yMin + halfH;
            float maxY = _bounds.yMax - halfH;

            float x = minX <= maxX ? Mathf.Clamp(p.x, minX, maxX) : _bounds.center.x;
            float y = minY <= maxY ? Mathf.Clamp(p.y, minY, maxY) : _bounds.center.y;
            return new Vector3(x, y, p.z);
        }
    }
}
