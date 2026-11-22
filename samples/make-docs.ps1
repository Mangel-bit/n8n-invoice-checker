# Turns samples/html into the demo files:
#   demo-upload/  the 6 documents you drag into the app during the video (PDFs, a scan, phone photos)
#   seed/         3 older documents that are already in the ledger when the demo starts
$ErrorActionPreference = 'Stop'
$here = $PSScriptRoot
$html = Join-Path $here 'html'
$raw = Join-Path $here 'raw'
$demo = Join-Path $here 'demo-upload'
$seed = Join-Path $here 'seed'
New-Item -ItemType Directory -Force $raw, $demo, $seed | Out-Null
node (Join-Path $here 'make-html.js')

$edge = "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
$profile = Join-Path $env:TEMP 'edge-headless-docs'
function Edge([string[]]$argList) {
  $base = @('--headless=new', '--disable-gpu', '--hide-scrollbars', "--user-data-dir=$profile", '--no-first-run')
  Start-Process -FilePath $edge -ArgumentList ($base + $argList) -Wait -WindowStyle Hidden
}
function Pdf($name, $outName) {
  $src = 'file:///' + ((Join-Path $html "$name.html") -replace '\\', '/')
  Edge @('--no-pdf-header-footer', "--print-to-pdf=`"$(Join-Path $demo $outName)`"", $src)
}
function Shot($name, $w, $h, $scale) {
  $src = 'file:///' + ((Join-Path $html "$name.html") -replace '\\', '/')
  Edge @("--window-size=$w,$h", "--force-device-scale-factor=$scale", "--screenshot=`"$(Join-Path $raw "$name.png")`"", $src)
}

Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System; using System.Drawing; using System.Drawing.Drawing2D; using System.Drawing.Imaging; using System.Runtime.InteropServices;
public static class Fx {
  static void Save(Bitmap b, string path, long q) {
    if (path.EndsWith(".png")) { b.Save(path, ImageFormat.Png); return; }
    var enc = Array.Find(ImageCodecInfo.GetImageEncoders(), e => e.MimeType == "image/jpeg");
    var p = new EncoderParameters(1); p.Param[0] = new EncoderParameter(System.Drawing.Imaging.Encoder.Quality, q);
    b.Save(path, enc, p);
  }
  static Bitmap Soften(Bitmap b, double f) {
    var small = new Bitmap(b, (int)(b.Width * f), (int)(b.Height * f));
    var back = new Bitmap(b.Width, b.Height);
    using (var g = Graphics.FromImage(back)) { g.InterpolationMode = InterpolationMode.HighQualityBilinear; g.DrawImage(small, 0, 0, b.Width, b.Height); }
    small.Dispose(); return back;
  }
  static void Noise(Bitmap b, int amount, bool gray, int seed) {
    var r = new Random(seed); var rect = new Rectangle(0, 0, b.Width, b.Height);
    var d = b.LockBits(rect, ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
    var px = new byte[d.Stride * b.Height]; Marshal.Copy(d.Scan0, px, 0, px.Length);
    for (int i = 0; i < px.Length; i += 4) {
      int n = r.Next(-amount, amount + 1);
      if (gray) { int v = (px[i] * 11 + px[i + 1] * 59 + px[i + 2] * 30) / 100; px[i] = px[i + 1] = px[i + 2] = (byte)v; }
      for (int c = 0; c < 3; c++) { int v = px[i + c] + n + (gray ? 0 : r.Next(-2, 3)); px[i + c] = (byte)Math.Max(0, Math.Min(255, v)); }
    }
    Marshal.Copy(px, 0, d.Scan0, px.Length); b.UnlockBits(d);
  }
  // A phone photo: the page lying on a table, slightly turned, uneven light, a bit soft and noisy.
  public static void Photo(string src, string dst, float angle, int W, int H, float fit, string table1, string table2, long q, int seed) {
    using (var img = new Bitmap(src)) using (var b = new Bitmap(W, H)) {
      using (var g = Graphics.FromImage(b)) {
        g.SmoothingMode = SmoothingMode.AntiAlias; g.InterpolationMode = InterpolationMode.HighQualityBicubic;
        using (var bg = new LinearGradientBrush(new Rectangle(0, 0, W, H), ColorTranslator.FromHtml(table1), ColorTranslator.FromHtml(table2), 60f)) g.FillRectangle(bg, 0, 0, W, H);
        float s = Math.Min(W * fit / img.Width, H * fit / img.Height); float w = img.Width * s, h = img.Height * s;
        g.TranslateTransform(W / 2f, H / 2f); g.RotateTransform(angle);
        for (int k = 14; k > 0; k--) using (var sh = new SolidBrush(Color.FromArgb(7, 0, 0, 0))) g.FillRectangle(sh, -w / 2 + 6 - k, -h / 2 + 10 - k, w + 2 * k, h + 2 * k);
        g.DrawImage(img, -w / 2, -h / 2, w, h); g.ResetTransform();
        using (var path = new GraphicsPath()) {
          path.AddEllipse(-W * 0.35f, -H * 0.3f, W * 1.7f, H * 1.6f);
          using (var pg = new PathGradientBrush(path)) {
            pg.CenterPoint = new PointF(W * 0.38f, H * 0.32f); pg.CenterColor = Color.FromArgb(0, 0, 0, 0);
            pg.SurroundColors = new[] { Color.FromArgb(150, 20, 16, 10) }; g.FillRectangle(pg, 0, 0, W, H);
          }
        }
        using (var warm = new SolidBrush(Color.FromArgb(18, 255, 190, 90))) g.FillRectangle(warm, 0, 0, W, H);
      }
      using (var soft = Soften(b, 0.62)) { Noise(soft, 9, false, seed); Save(soft, dst, q); }
    }
  }
  // A flatbed scan: grey, a hair crooked, faint speckles.
  public static void Scan(string src, string dst, float angle) {
    using (var img = new Bitmap(src)) using (var b = new Bitmap(img.Width, img.Height)) {
      using (var g = Graphics.FromImage(b)) {
        g.Clear(Color.FromArgb(244, 244, 241)); g.InterpolationMode = InterpolationMode.HighQualityBicubic;
        g.TranslateTransform(img.Width / 2f, img.Height / 2f); g.RotateTransform(angle); g.DrawImage(img, -img.Width / 2f, -img.Height / 2f, img.Width, img.Height);
      }
      using (var soft = Soften(b, 0.8)) { Noise(soft, 7, true, 7); Save(soft, dst, 0); }
    }
  }
  public static void Small(string src, string dst, int width, long q) {
    using (var img = new Bitmap(src)) using (var b = new Bitmap(img, width, img.Height * width / img.Width)) Save(b, dst, q);
  }
}
'@

# PDFs straight from the supplier
Pdf 'kova-print-invoice' '1-kova-print-invoice.pdf'
Pdf 'brightwave-invoice' '3-brightwave-invoice.pdf'
Pdf 'atlas-invoice' '5-atlas-office-invoice.pdf'

# Screenshots that become a scan and phone photos
Shot 'pixel-pine-invoice' 816 1056 1.5
Shot 'weber-rechnung' 816 1056 1.5
Shot 'harbor-hardware-receipt' 380 690 2
Shot 'copperline-receipt' 380 470 2
Shot 'studio-supply-invoice' 816 1056 1
Shot 'brightwave-invoice' 816 1056 1

[Fx]::Photo((Join-Path $raw 'harbor-hardware-receipt.png'), (Join-Path $demo '2-harbor-hardware-receipt.jpg'), -5.5, 1200, 1600, 0.86, '#8a6a4d', '#5b4330', 72, 11)
[Fx]::Scan((Join-Path $raw 'pixel-pine-invoice.png'), (Join-Path $demo '4-pixel-and-pine-invoice.png'), 1.1)
[Fx]::Photo((Join-Path $raw 'weber-rechnung.png'), (Join-Path $demo '6-druckerei-weber-rechnung.jpg'), 3.2, 1500, 1900, 0.9, '#c9c3b8', '#8f897f', 74, 23)

# Seed documents, kept small because they ship inside the workflow
[Fx]::Small((Join-Path $raw 'brightwave-invoice.png'), (Join-Path $seed 'brightwave-invoice.jpg'), 760, 70)
[Fx]::Small((Join-Path $raw 'studio-supply-invoice.png'), (Join-Path $seed 'studio-supply-invoice.jpg'), 760, 70)
[Fx]::Photo((Join-Path $raw 'copperline-receipt.png'), (Join-Path $seed 'copperline-receipt.jpg'), 4, 760, 1000, 0.86, '#4d5a57', '#2c3533', 66, 5)

Get-ChildItem $demo, $seed | Select-Object Name, @{n = 'KB'; e = { [math]::Round($_.Length / 1KB) } } | Format-Table -AutoSize | Out-String
