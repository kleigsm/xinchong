Add-Type -AssemblyName System.Drawing

$FW = 128
$FH = 128
$COLS = 4
$ROWS = 4

# 三套性格的配色
$PALETTES = @(
    @{ Id = "shy";      Base = @(236, 110, 140); Light = @(255, 214, 224) },
    @{ Id = "cheerful"; Base = @(245, 166, 35);  Light = @(255, 233, 194) },
    @{ Id = "tsundere"; Base = @(155, 126, 222); Light = @(227, 217, 255) }
)

$eyeColor = [System.Drawing.Color]::FromArgb(255, 58, 42, 46)
$mouthColor = [System.Drawing.Color]::FromArgb(255, 120, 40, 60)

function Draw-Pet {
    param(
        [System.Drawing.Graphics]$G,
        [int]$Col,
        [int]$Row,
        [double]$Dx = 0,
        [double]$Dy = 0,
        [double]$Sx = 1.0,
        [double]$Sy = 1.0,
        [string]$Eyes = "open",
        [string]$Mouth = "smile",
        [double]$Rotate = 0
    )

    $cx = [double]($Col * $FW + $FW / 2 + $Dx)
    $cy = [double]($Row * $FH + $FH / 2 + $Dy)

    $state = $G.Save()
    if ($Rotate -ne 0) {
        $G.TranslateTransform([float]$cx, [float]$cy)
        $G.RotateTransform([float]$Rotate)
        $G.TranslateTransform([float](-$cx), [float](-$cy))
    }

    $rx = [double](44 * $Sx)
    $ry = [double](44 * $Sy)

    $bodyRect = [System.Drawing.RectangleF]::new([float]($cx - $rx), [float]($cy - $ry), [float]($rx * 2), [float]($ry * 2))
    $base = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, $script:Base[0], $script:Base[1], $script:Base[2]))
    $G.FillEllipse($base, $bodyRect)
    $base.Dispose()

    $innerRect = [System.Drawing.RectangleF]::new([float]($cx - $rx * 0.82), [float]($cy - $ry * 0.82), [float]($rx * 1.64), [float]($ry * 1.64))
    $light = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(70, $script:Light[0], $script:Light[1], $script:Light[2]))
    $G.FillEllipse($light, $innerRect)
    $light.Dispose()

    $hiRect = [System.Drawing.RectangleF]::new([float]($cx - $rx * 0.5), [float]($cy - $ry * 0.8), [float]($rx * 0.55), [float]($ry * 0.32))
    $hi = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(95, 255, 255, 255))
    $G.FillEllipse($hi, $hiRect)
    $hi.Dispose()

    $eyeY = $cy - $ry * 0.15
    $eyeDx = $rx * 0.34

    switch ($Eyes) {
        "open" {
            $eb = [System.Drawing.SolidBrush]::new($eyeColor)
            $ew = 9.0; $eh = 11.0
            $G.FillEllipse($eb, [float]($cx - $eyeDx - $ew / 2), [float]($eyeY - $eh / 2), [float]$ew, [float]$eh)
            $G.FillEllipse($eb, [float]($cx + $eyeDx - $ew / 2), [float]($eyeY - $eh / 2), [float]$ew, [float]$eh)
            $spark = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::White)
            $G.FillEllipse($spark, [float]($cx - $eyeDx - 2.5), [float]($eyeY - 4), [float]3.5, [float]3.5)
            $G.FillEllipse($spark, [float]($cx + $eyeDx - 2.5), [float]($eyeY - 4), [float]3.5, [float]3.5)
            $spark.Dispose()
            $eb.Dispose()
        }
        "happy" {
            $pen = [System.Drawing.Pen]::new($eyeColor, [float]4)
            $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
            $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
            $G.DrawArc($pen, [float]($cx - $eyeDx - 7), [float]($eyeY - 4), [float]14, [float]12, [float]200, [float]140)
            $G.DrawArc($pen, [float]($cx + $eyeDx - 7), [float]($eyeY - 4), [float]14, [float]12, [float]200, [float]140)
            $pen.Dispose()
        }
        "closed" {
            $pen = [System.Drawing.Pen]::new($eyeColor, [float]4)
            $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
            $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
            $G.DrawArc($pen, [float]($cx - $eyeDx - 7), [float]($eyeY - 6), [float]14, [float]10, [float]20, [float]140)
            $G.DrawArc($pen, [float]($cx + $eyeDx - 7), [float]($eyeY - 6), [float]14, [float]10, [float]20, [float]140)
            $pen.Dispose()
        }
    }

    $mouthY = $cy + $ry * 0.28
    switch ($Mouth) {
        "smile" {
            $pen = [System.Drawing.Pen]::new($eyeColor, [float]3.5)
            $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
            $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
            $G.DrawArc($pen, [float]($cx - 9), [float]($mouthY - 7), [float]18, [float]12, [float]20, [float]140)
            $pen.Dispose()
        }
        "open" {
            $mb = [System.Drawing.SolidBrush]::new($mouthColor)
            $G.FillEllipse($mb, [float]($cx - 8), [float]($mouthY - 6), [float]16, [float]13)
            $mb.Dispose()
        }
        "flat" {
            $pen = [System.Drawing.Pen]::new($eyeColor, [float]3.5)
            $G.DrawLine($pen, [float]($cx - 7), [float]$mouthY, [float]($cx + 7), [float]$mouthY)
            $pen.Dispose()
        }
    }

    $G.Restore($state)
}

function New-Sheet {
    param([string]$Id, [int[]]$Base, [int[]]$Light)

    $script:Base = $Base
    $script:Light = $Light

    $bmp = [System.Drawing.Bitmap]::new($FW * $COLS, $FH * $ROWS)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.Clear([System.Drawing.Color]::Transparent)

    # 第 0 行：待机
    Draw-Pet -G $g -Col 0 -Row 0 -Dy -2 -Eyes open -Mouth smile
    Draw-Pet -G $g -Col 1 -Row 0 -Dy 0 -Eyes open -Mouth smile
    Draw-Pet -G $g -Col 2 -Row 0 -Dy 2 -Eyes open -Mouth smile
    Draw-Pet -G $g -Col 3 -Row 0 -Dy 0 -Eyes closed -Mouth smile

    # 第 1 行：点击反应
    Draw-Pet -G $g -Col 0 -Row 1 -Sy 0.88 -Sx 1.08 -Eyes happy -Mouth open
    Draw-Pet -G $g -Col 1 -Row 1 -Sy 1.08 -Sx 0.94 -Eyes happy -Mouth open
    Draw-Pet -G $g -Col 2 -Row 1 -Dy -4 -Eyes happy -Mouth open
    Draw-Pet -G $g -Col 3 -Row 1 -Eyes happy -Mouth smile

    # 第 2 行：拖拽
    Draw-Pet -G $g -Col 0 -Row 2 -Rotate -8 -Eyes open -Mouth open
    Draw-Pet -G $g -Col 1 -Row 2 -Rotate 8 -Eyes open -Mouth open

    # 第 3 行：睡觉
    Draw-Pet -G $g -Col 0 -Row 3 -Dy 2 -Sy 0.94 -Eyes closed -Mouth flat
    Draw-Pet -G $g -Col 1 -Row 3 -Dy 4 -Sy 0.92 -Eyes closed -Mouth flat

    $dir = "E:\xinchong\src\renderer\assets"
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
    $out = Join-Path $dir "pet-$Id.png"
    $bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)

    $g.Dispose()
    $bmp.Dispose()

    Write-Host ("生成 {0}  ({1:N1} KB)" -f (Split-Path $out -Leaf), ((Get-Item $out).Length / 1KB))
}

foreach ($p in $PALETTES) {
    New-Sheet -Id $p.Id -Base $p.Base -Light $p.Light
}
