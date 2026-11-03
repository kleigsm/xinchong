# P0-1 测量脚本
# 用法：芯宠跑起来之后，在仓库根目录执行
#   pwsh -File scripts/measure.ps1
# 输出：进程数 / 内存合计 / 空闲 CPU / 各进程明细

$ErrorActionPreference = 'Stop'

$procs = @(Get-Process electron -ErrorAction SilentlyContinue)
if ($procs.Count -eq 0) {
    Write-Host "未检测到 electron 进程，请先运行 pnpm start" -ForegroundColor Red
    exit 1
}

$mem = ($procs | Measure-Object WorkingSet64 -Sum).Sum / 1MB
$cores = [Environment]::ProcessorCount

Write-Host "==== 芯宠 P0-1 测量 ====" -ForegroundColor Cyan
Write-Host ("进程数      : {0}" -f $procs.Count)
Write-Host ("内存合计    : {0:N1} MB" -f $mem)
Write-Host ("逻辑核心数  : {0}" -f $cores)
Write-Host ""

# 空闲 CPU：10 秒内累计 CPU 时间的变化，换算成整机占比
$cpuBefore = ($procs | Measure-Object TotalProcessorTime -Sum).Sum.TotalSeconds
Start-Sleep -Seconds 10
$procs2 = @(Get-Process electron -ErrorAction SilentlyContinue)
if ($procs2.Count -eq 0) {
    Write-Host "进程已退出，CPU 采样失败" -ForegroundColor Yellow
    exit 1
}
$cpuAfter = ($procs2 | Measure-Object TotalProcessorTime -Sum).Sum.TotalSeconds
$deltaCpu = $cpuAfter - $cpuBefore
$cpuPct = ($deltaCpu / 10.0) / $cores * 100

Write-Host ("空闲 CPU    : {0:N2}%（整机占比）" -f $cpuPct)
Write-Host ("            即 10 秒内消耗 {0:N2} 秒 CPU 时间" -f $deltaCpu)
Write-Host ""
Write-Host "---- 各进程明细 ----" -ForegroundColor Cyan
$procs2 |
    Select-Object Id, @{n='内存MB'; e={[math]::Round($_.WorkingSet64/1MB,1)}},
                  @{n='CPU秒'; e={[math]::Round($_.TotalProcessorTime.TotalSeconds,2)}},
                  @{n='进程类型'; e={ if ($_.CommandLine -match '--type=(\w+)') { $matches[1] } else { 'main' } }} |
    Sort-Object 内存MB -Descending |
    Format-Table -AutoSize
