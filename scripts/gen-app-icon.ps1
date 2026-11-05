Add-Type -AssemblyName System.Drawing

# 生成应用图标：512×512 PNG，圆脸角色居中
$S = 512
$bmp = [System.Drawing.Bitmap]::new($S, $S)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.Clear([System.Drawing.Color]::Transparent)

$cx = $S / 2
$cy = $S / 2
$r = 224

# 阴影
$shadow = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(40, 120, 40, 70))
$g.FillEllipse($shadow, [float]($cx - $r + 6), [float]($cy - $r + 14), [float]($r * 2), [float]($r * 2))
$shadow.Dispose()

# 身体
$body = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 236, 110, 140))
$g.FillEllipse($body, [float]($cx - $r), [float]($cy - $r), [float]($r * 2), [float]($r * 2))
$body.Dispose()

# 内层柔光
$inner = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(70, 255, 226, 236))
$g.FillEllipse($inner, [float]($cx - $r * 0.82), [float]($cy - $r * 0.82), [float]($r * 1.64), [float]($r * 1.64))
$inner.Dispose()

# 高光
$hi = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(95, 255, 255, 255))
$g.FillEllipse($hi, [float]($cx - $r * 0.5), [float]($cy - $r * 0.8), [float]($r * 0.55), [float]($r * 0.32))
$hi.Dispose()

# 眼睛
$eyeColor = [System.Drawing.Color]::FromArgb(255, 58, 42, 46)
$eyeBrush = [System.Drawing.SolidBrush]::new($eyeColor)
$eyeDx = $r * 0.34
$eyeY = $cy - $r * 0.15
$ew = 34.0
$eh = 42.0
$g.FillEllipse($eyeBrush, [float]($cx - $eyeDx - $ew / 2), [float]($eyeY - $eh / 2), [float]$ew, [float]$eh)
$g.FillEllipse($eyeBrush, [float]($cx + $eyeDx - $ew / 2), [float]($eyeY - $eh / 2), [float]$ew, [float]$eh)
$eyeBrush.Dispose()

# 眼睛高光
$spark = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::White)
$g.FillEllipse($spark, [float]($cx - $eyeDx - 10), [float]($eyeY - 15), [float]13, [float]13)
$g.FillEllipse($spark, [float]($cx + $eyeDx - 10), [float]($eyeY - 15), [float]13, [float]13)
$spark.Dispose()

# 嘴巴
$mouthPen = [System.Drawing.Pen]::new($eyeColor, [float]13)
$mouthPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$mouthPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
$mouthY = $cy + $r * 0.28
$g.DrawArc($mouthPen, [float]($cx - 32), [float]($mouthY - 26), [float]64, [float]44, [float]20, [float]140)
$mouthPen.Dispose()

New-Item -ItemType Directory -Force -Path 'E:\xinchong\build' | Out-Null
$out = 'E:\xinchong\build\icon.png'
$bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$bmp.Dispose()

Write-Host ("图标已生成: {0} ({1:N0} KB)" -f $out, ((Get-Item $out).Length / 1KB))
