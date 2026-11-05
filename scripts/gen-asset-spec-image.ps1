Add-Type -AssemblyName System.Drawing

$W = 1000
$H = 780
$bmp = [System.Drawing.Bitmap]::new($W, $H)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit
$g.Clear([System.Drawing.Color]::White)

$fontTitle = [System.Drawing.Font]::new("Microsoft YaHei", 22, [System.Drawing.FontStyle]::Bold)
$fontSub   = [System.Drawing.Font]::new("Microsoft YaHei", 12)
$fontLabel = [System.Drawing.Font]::new("Microsoft YaHei", 13, [System.Drawing.FontStyle]::Bold)
$fontCell  = [System.Drawing.Font]::new("Consolas", 11)
$fontNote  = [System.Drawing.Font]::new("Microsoft YaHei", 12)
$black = [System.Drawing.Brushes]::Black
$gray  = [System.Drawing.Brushes]::Gray

$g.DrawString("芯宠 · 素材排版示意", $fontTitle, $black, 40, 28)
$g.DrawString("一张 PNG 装下所有动作，按格子排列", $fontSub, $gray, 42, 66)

$cell = 110
$cols = 4
$rows = 4
$ox = 190
$oy = 130

$rowNames = @("第 1 行：待机 idle", "第 2 行：点击 click", "第 3 行：拖拽 drag", "第 4 行：睡觉 sleep")
$rowCount = @(4, 4, 2, 2)
$rowColor = @(
    [System.Drawing.Color]::FromArgb(255, 255, 226, 234),
    [System.Drawing.Color]::FromArgb(255, 255, 240, 214),
    [System.Drawing.Color]::FromArgb(255, 233, 226, 255),
    [System.Drawing.Color]::FromArgb(255, 226, 240, 255)
)

$gridPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(255, 190, 195, 205), 1.5)
$emptyBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 246, 247, 249))
$emptyPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(255, 210, 214, 220), 1)

# 顶部列标
for ($c = 0; $c -lt $cols; $c++) {
    $text = "第 $($c + 1) 列"
    $g.DrawString($text, $fontSub, $gray, ($ox + $c * $cell + 24), ($oy - 26))
}

for ($r = 0; $r -lt $rows; $r++) {
    # 行标签
    $g.DrawString($rowNames[$r], $fontLabel, $black, 24, ($oy + $r * $cell + 40))

    for ($c = 0; $c -lt $cols; $c++) {
        $x = $ox + $c * $cell
        $y = $oy + $r * $cell
        $used = $c -lt $rowCount[$r]

        if ($used) {
            $brush = [System.Drawing.SolidBrush]::new($rowColor[$r])
            $g.FillRectangle($brush, $x + 2, $y + 2, $cell - 4, $cell - 4)
            $brush.Dispose()
        } else {
            $g.FillRectangle($emptyBrush, $x + 2, $y + 2, $cell - 4, $cell - 4)
            $g.DrawLine($emptyPen, $x + 2, $y + 2, $x + $cell - 2, $y + $cell - 2)
            $g.DrawString("空", $fontSub, $gray, ($x + 42), ($y + 42))
        }

        $g.DrawRectangle($gridPen, $x, $y, $cell, $cell)

        # 格子编号
        $idx = $r * $cols + $c
        $g.DrawString("$idx", $fontCell, $gray, ($x + 6), ($y + 4))
    }
}

# 右侧说明
$rx = 690
$ty = 130
$lines = @(
    "尺寸：每格 128 × 128 px",
    "整图 = 4 列 × 4 行 = 512 × 512",
    "背景：透明 PNG",
    "",
    "帧数：",
    "  待机 4 帧   点击 4 帧",
    "  拖拽 2 帧   睡觉 2 帧",
    "",
    "规则：",
    "  · 每个动作从新的一行开始",
    "  · 没用到的格子留空即可",
    "  · 角色居中，四周留 8px",
    "  · 别让动作超出格子边界"
)
$y = $ty
foreach ($line in $lines) {
    $g.DrawString($line, $fontNote, $(if ($line.StartsWith("  ")) { $gray } else { $black }), $rx, $y)
    $y += 30
}

# 底部提示
$g.FillRectangle([System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 255, 249, 235)), 40, 610, 920, 120)
$tipPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(255, 235, 200, 120), 2)
$g.DrawRectangle($tipPen, 40, 610, 920, 120)
$g.DrawString("交付：3 张图（pet-shy.png / pet-cheerful.png / pet-tsundere.png）", $fontLabel, $black, 62, 628)
$g.DrawString("先交 1 张（害羞）也可以，我们先把流程跑通，再补另外两套。", $fontNote, $gray, 62, 662)
$g.DrawString("详细文字规格见：docs/specs/asset-spec.md", $fontNote, $gray, 62, 692)

$out = "E:\xinchong\docs\specs\asset-spec-grid.png"
$bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$bmp.Dispose()
Write-Host ("已生成 {0} ({1:N0} KB)" -f $out, ((Get-Item $out).Length / 1KB))
