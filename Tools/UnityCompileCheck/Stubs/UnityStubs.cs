// ---------------------------------------------------------------------------
// 仅用于「无 Unity 环境下的编译检查」的最小 UnityEngine / UnityEditor 桩。
// 不参与游戏构建（不在 Assets/ 下，Unity 永远看不到它）。
// 目的：在没有装 Unity 的机器上，也能把 Data / Unity / Editor 三层编译一遍，
//       抓出拼写错误、重构残留、字段名写错这类问题。
// ---------------------------------------------------------------------------
using System;

namespace UnityEngine
{
    public class Object
    {
        public string name;
        public HideFlags hideFlags;
        public static void Destroy(Object obj) { }
        public static void DestroyImmediate(Object obj) { }
    }

    public enum HideFlags { None = 0, DontSave = 52 }

    public class Component : Object
    {
        public Transform transform { get { return null; } }
        public GameObject gameObject { get { return null; } }
        public T GetComponent<T>() where T : Component { return null; }
    }

    public class Behaviour : Component { public bool enabled { get; set; } }
    public class MonoBehaviour : Behaviour { }

    public class Transform : Component
    {
        public Vector3 position { get; set; }
        public Vector3 localScale { get; set; }
        public void SetParent(Transform parent, bool worldPositionStays) { }
    }

    public class GameObject : Object
    {
        public GameObject() { }
        public GameObject(string n) { }
        public string tag { get; set; }
        public Transform transform { get { return null; } }
        public T AddComponent<T>() where T : Component { return null; }
    }

    public enum CameraClearFlags { SolidColor = 2 }

    public class Camera : Behaviour
    {
        public bool orthographic { get; set; }
        public float orthographicSize { get; set; }
        public float aspect { get { return 1.7777f; } }
        public CameraClearFlags clearFlags { get; set; }
        public Color backgroundColor { get; set; }
        public RenderTexture targetTexture { get; set; }
        public void Render() { }
        public static Camera main { get { return null; } }
        public Vector3 ScreenToWorldPoint(Vector3 p) { return default(Vector3); }
        public Vector3 WorldToScreenPoint(Vector3 p) { return default(Vector3); }
    }

    public class AudioListener : Behaviour { }
    public class Renderer : Component
    {
        public bool enabled { get; set; }
        public int sortingOrder { get; set; }
        public Color color { get; set; }
    }
    public class SpriteRenderer : Renderer { public Sprite sprite { get; set; } }

    public enum TextureFormat { RGBA32 = 4, RGB24 = 3 }
    public enum FilterMode { Point = 0 }
    public enum TextureWrapMode { Clamp = 1 }
    public enum SpriteMeshType { FullRect = 1 }

    public class Texture : Object { }

    public class RenderTexture : Texture
    {
        public RenderTexture(int width, int height, int depth) { }
        public static RenderTexture active { get; set; }
    }

    public class Texture2D : Texture
    {
        public Texture2D(int w, int h, TextureFormat format, bool mipChain) { }
        public FilterMode filterMode { get; set; }
        public TextureWrapMode wrapMode { get; set; }
        public void SetPixels(Color[] colors) { }
        public void Apply(bool updateMipmaps = true, bool makeNoLongerReadable = false) { }
        public void ReadPixels(Rect source, int destX, int destY) { }
        public byte[] EncodeToPNG() { return null; }
        public static Texture2D whiteTexture { get { return null; } }
    }

    public enum EventType { MouseDown = 0, MouseUp = 1, Repaint = 7, Layout = 8 }

    public class Event
    {
        public static Event current { get { return null; } }
        public EventType type { get; set; }
        public int button { get; set; }
        public Vector2 mousePosition { get; set; }
    }

    public class Sprite : Object
    {
        public Texture2D texture { get { return null; } }
        public static Sprite Create(Texture2D texture, Rect rect, Vector2 pivot, float pixelsPerUnit) { return null; }
        public static Sprite Create(Texture2D texture, Rect rect, Vector2 pivot, float pixelsPerUnit, uint extrude) { return null; }
        public static Sprite Create(Texture2D texture, Rect rect, Vector2 pivot, float pixelsPerUnit, uint extrude, SpriteMeshType meshType) { return null; }
    }

    public struct Vector2
    {
        public float x;
        public float y;
        public Vector2(float x, float y) { this.x = x; this.y = y; }
        public static Vector2 zero { get { return new Vector2(0f, 0f); } }
    }

    public struct Vector3
    {
        public float x;
        public float y;
        public float z;
        public Vector3(float x, float y) { this.x = x; this.y = y; this.z = 0f; }
        public Vector3(float x, float y, float z) { this.x = x; this.y = y; this.z = z; }
        public static Vector3 zero { get { return new Vector3(0f, 0f, 0f); } }
        public static Vector3 one { get { return new Vector3(1f, 1f, 1f); } }
        public static Vector3 MoveTowards(Vector3 current, Vector3 target, float maxDelta) { return current; }
        public static Vector3 Lerp(Vector3 a, Vector3 b, float t) { return a; }
        public static Vector3 operator +(Vector3 a, Vector3 b) { return new Vector3(a.x + b.x, a.y + b.y, a.z + b.z); }
        public static Vector3 operator -(Vector3 a, Vector3 b) { return new Vector3(a.x - b.x, a.y - b.y, a.z - b.z); }
        public static Vector3 operator *(Vector3 a, float k) { return new Vector3(a.x * k, a.y * k, a.z * k); }
    }

    public struct Rect
    {
        public float x;
        public float y;
        public float width;
        public float height;
        public Rect(float x, float y, float width, float height) { this.x = x; this.y = y; this.width = width; this.height = height; }
        public float xMin { get { return x; } }
        public float xMax { get { return x + width; } }
        public float yMin { get { return y; } }
        public float yMax { get { return y + height; } }
        public bool Contains(Vector2 p) { return p.x >= x && p.x < xMax && p.y >= y && p.y < yMax; }
        public Vector2 center { get { return new Vector2(x + width * 0.5f, y + height * 0.5f); } }
        public static Rect MinMaxRect(float xmin, float ymin, float xmax, float ymax) { return new Rect(xmin, ymin, xmax - xmin, ymax - ymin); }
    }

    public struct Color
    {
        public float r;
        public float g;
        public float b;
        public float a;
        public Color(float r, float g, float b) { this.r = r; this.g = g; this.b = b; this.a = 1f; }
        public Color(float r, float g, float b, float a) { this.r = r; this.g = g; this.b = b; this.a = a; }
        public static Color white { get { return new Color(1f, 1f, 1f); } }
        public static Color gray { get { return new Color(0.5f, 0.5f, 0.5f); } }
        public static Color magenta { get { return new Color(1f, 0f, 1f); } }
        public static Color HSVToRGB(float h, float s, float v) { return white; }
        public static Color Lerp(Color a, Color b, float t) { return a; }
    }

    public static class Mathf
    {
        public const float Infinity = float.PositiveInfinity;
        public static float Clamp01(float v) { return v; }
        public static int Clamp(int v, int min, int max) { return v; }
        public static float Clamp(float v, float min, float max) { return v; }
        public static int Max(int a, int b) { return a; }
        public static float Max(float a, float b) { return a; }
        public static int Min(int a, int b) { return a; }
        public static float Min(float a, float b) { return a; }
        public static int Abs(int v) { return v; }
        public static float Abs(float v) { return v; }
        public static int RoundToInt(float v) { return 0; }
        public static int FloorToInt(float v) { return 0; }
        public static int CeilToInt(float v) { return 0; }
        public static float Sin(float v) { return 0f; }
        public static float Exp(float v) { return 0f; }
        public static float Lerp(float a, float b, float t) { return a; }
        public static float SmoothDamp(float current, float target, ref float currentVelocity, float smoothTime) { return current; }
        public static float SmoothDamp(float current, float target, ref float currentVelocity, float smoothTime, float maxSpeed) { return current; }
        public static float SmoothDamp(float current, float target, ref float currentVelocity, float smoothTime, float maxSpeed, float deltaTime) { return current; }
    }

    public static class Debug
    {
        public static void Log(object message) { }
        public static void LogWarning(object message) { }
        public static void LogError(object message) { }
    }

    public static class Application
    {
        public static string streamingAssetsPath { get { return ""; } }
        public static string persistentDataPath { get { return ""; } }
        public static int targetFrameRate { get; set; }
        public static bool isBatchMode { get { return true; } }
        public static bool isFocused { get { return true; } }
        public static void Quit() { }
    }

    public static class ScreenCapture
    {
        public static void CaptureScreenshot(string filename) { }
    }

    public static class Time
    {
        public static float deltaTime { get { return 0.016f; } }
        public static float time { get { return 0f; } }
        public static float timeSinceLevelLoad { get { return 0f; } }
    }

    public enum KeyCode { A, B, C, D, I, J, S, W, Space, Escape, UpArrow, DownArrow, LeftArrow, RightArrow }

    public static class Input
    {
        public static bool anyKey { get { return false; } }
        public static Vector3 mousePosition { get { return default(Vector3); } }
        public static bool GetKey(KeyCode key) { return false; }
        public static bool GetKeyDown(KeyCode key) { return false; }
        public static bool GetMouseButtonDown(int button) { return false; }
    }

    public static class Screen
    {
        public static int width { get { return 1280; } }
        public static int height { get { return 720; } }
    }

    public enum TextAnchor { UpperLeft = 0, MiddleCenter = 4, MiddleLeft = 3 }

    public class GUIStyleState { public Color textColor { get; set; } }

    public class GUIStyle
    {
        public GUIStyle() { }
        public GUIStyle(GUIStyle other) { }
        public int fontSize { get; set; }
        public TextAnchor alignment { get; set; }
        public GUIStyleState normal { get { return null; } }
    }

    public class GUISkin { public GUIStyle label { get { return null; } } }

    public static class GUI
    {
        public static GUISkin skin { get { return null; } }
        public static Color color { get; set; }
        public static void Label(Rect position, string text, GUIStyle style) { }
        public static void Box(Rect position, string text) { }
        public static void DrawTexture(Rect position, Texture image) { }
    }

    public static class JsonUtility
    {
        public static T FromJson<T>(string json) { return default(T); }
        public static string ToJson(object obj) { return ""; }
    }

    [AttributeUsage(AttributeTargets.Field)]
    public class HeaderAttribute : Attribute { public HeaderAttribute(string header) { } }

    [AttributeUsage(AttributeTargets.Field)]
    public class TooltipAttribute : Attribute { public TooltipAttribute(string tooltip) { } }

    [AttributeUsage(AttributeTargets.Field)]
    public class SerializeField : Attribute { }

    [AttributeUsage(AttributeTargets.Field)]
    public class HideInInspector : Attribute { }

    [AttributeUsage(AttributeTargets.Field)]
    public class RangeAttribute : Attribute { public RangeAttribute(float min, float max) { } }

    [AttributeUsage(AttributeTargets.Class)]
    public class RequireComponent : Attribute { public RequireComponent(Type t) { } }
}

namespace UnityEngine.SceneManagement
{
    public struct Scene { public string path { get { return ""; } } }

    public static class SceneManager { public static Scene GetActiveScene() { return default(Scene); } }
}

namespace UnityEditor
{
    [AttributeUsage(AttributeTargets.Method)]
    public class MenuItem : Attribute
    {
        public MenuItem(string itemName) { }
        public MenuItem(string itemName, bool isValidateFunction) { }
        public MenuItem(string itemName, bool isValidateFunction, int priority) { }
    }

    public static class EditorUtility
    {
        public static bool DisplayDialog(string title, string message, string ok, string cancel) { return true; }
        public static void RevealInFinder(string path) { }
    }

    public static class AssetDatabase { public static void Refresh() { } }

    public enum BuildTarget { StandaloneOSX = 2, StandaloneWindows64 = 19 }

    public enum BuildTargetGroup { Standalone = 1 }

    public enum BuildOptions { None = 0, Development = 1 }

    public struct BuildPlayerOptions
    {
        public string[] scenes;
        public string locationPathName;
        public BuildTarget target;
        public BuildTargetGroup targetGroup;
        public BuildOptions options;
    }

    public static class BuildPipeline
    {
        public static UnityEditor.Build.Reporting.BuildReport BuildPlayer(BuildPlayerOptions options) { return null; }
    }

    public static class EditorApplication
    {
        public static bool isPlaying { get; set; }
        public static Action update;
        public static void Exit(int returnValue) { }
    }

    public static class SessionState
    {
        public static bool GetBool(string key, bool defaultValue) { return defaultValue; }
        public static void SetBool(string key, bool value) { }
    }

    [AttributeUsage(AttributeTargets.Method)]
    public class InitializeOnLoadMethodAttribute : Attribute { }

    public class EditorBuildSettingsScene
    {
        public EditorBuildSettingsScene(string path, bool enabled) { this.path = path; this.enabled = enabled; }
        public string path;
        public bool enabled;
    }

    public static class EditorBuildSettings { public static EditorBuildSettingsScene[] scenes { get; set; } }
}

namespace UnityEditor.Build.Reporting
{
    public enum BuildResult { Unknown = 0, Succeeded = 1, Failed = 2, Cancelled = 3 }

    public struct BuildSummary
    {
        public BuildResult result;
        public ulong totalSize;
        public System.TimeSpan totalTime;
        public int totalErrors;
        public int totalWarnings;
    }

    public class BuildReport
    {
        public BuildSummary summary { get { return default(BuildSummary); } }
    }
}

namespace UnityEditor.SceneManagement
{
    public enum NewSceneSetup { EmptyScene }
    public enum NewSceneMode { Single }
    public enum OpenSceneMode { Single }

    public static class EditorSceneManager
    {
        public static UnityEngine.SceneManagement.Scene NewScene(NewSceneSetup setup, NewSceneMode mode) { return default(UnityEngine.SceneManagement.Scene); }
        public static UnityEngine.SceneManagement.Scene OpenScene(string path, OpenSceneMode mode) { return default(UnityEngine.SceneManagement.Scene); }
        public static bool SaveScene(UnityEngine.SceneManagement.Scene scene, string path) { return true; }
    }
}
