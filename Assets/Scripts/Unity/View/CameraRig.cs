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

        public CameraRig(Camera camera, Transform target, Rect mapBounds, float smoothTime)
        {
            _camera = camera;
            _target = target;
            _bounds = mapBounds;
            _smoothTime = Mathf.Max(0.001f, smoothTime);
        }

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
            _camera.transform.position = ClampToBounds(desired);
        }

        public void Update(float dt)
        {
            if (_camera == null || _target == null) return;

            Vector3 desired = _target.position;
            desired.z = _camera.transform.position.z;

            float x = Mathf.SmoothDamp(_camera.transform.position.x, desired.x, ref _velocityX, _smoothTime, Mathf.Infinity, dt);
            float y = Mathf.SmoothDamp(_camera.transform.position.y, desired.y, ref _velocityY, _smoothTime, Mathf.Infinity, dt);

            _camera.transform.position = ClampToBounds(new Vector3(x, y, desired.z));
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
