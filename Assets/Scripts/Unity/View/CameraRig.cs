using UnityEngine;

namespace SimplyCQ.Unity
{
    /// <summary>相机跟随 + 地图边界夹取。普通类而不是 MonoBehaviour，避免脚本执行顺序问题。</summary>
    public sealed class CameraRig
    {
        private readonly Camera _camera;
        private readonly Transform _target;
        private readonly Rect _bounds;
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
