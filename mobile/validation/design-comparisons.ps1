# Compose original screenshot pixels without honoring embedded image DPI.
Add-Type -AssemblyName System.Drawing
$captureRoot=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../docs/design/debrief-portfolio-redesign'))
function New-Comparison([string]$reference,[string]$actual,[string]$output,[int]$cropX=0,[int]$cropWidth=0) {
 $left=[System.Drawing.Image]::FromFile((Join-Path $captureRoot $reference));$right=[System.Drawing.Image]::FromFile((Join-Path $captureRoot $actual))
 if($cropWidth -eq 0){$cropWidth=$right.Width}
 $canvas=[System.Drawing.Bitmap]::new(($left.Width+$cropWidth+20),([Math]::Max($left.Height,$right.Height)+36));$g=[System.Drawing.Graphics]::FromImage($canvas);$g.Clear([System.Drawing.Color]::White)
 $font=[System.Drawing.Font]::new('Arial',12,[System.Drawing.FontStyle]::Bold);$g.DrawString('Approved Figma',$font,[System.Drawing.Brushes]::Black,8,8);$g.DrawString('Implementation · synthetic fixture',$font,[System.Drawing.Brushes]::Black,($left.Width+28),8)
 $g.DrawImage($left,[System.Drawing.Rectangle]::new(0,36,$left.Width,$left.Height),[System.Drawing.Rectangle]::new(0,0,$left.Width,$left.Height),[System.Drawing.GraphicsUnit]::Pixel)
 $g.DrawImage($right,[System.Drawing.Rectangle]::new(($left.Width+20),36,$cropWidth,$right.Height),[System.Drawing.Rectangle]::new($cropX,0,$cropWidth,$right.Height),[System.Drawing.GraphicsUnit]::Pixel)
 $canvas.Save((Join-Path $captureRoot $output),[System.Drawing.Imaging.ImageFormat]::Png);$g.Dispose();$font.Dispose();$left.Dispose();$right.Dispose();$canvas.Dispose()
}
New-Comparison 'figma-debrief-mobile.png' 'debrief-390x844.jpg' 'comparison-debrief-mobile.png'
New-Comparison 'figma-debrief-desktop.png' 'debrief-1280x900.jpg' 'comparison-debrief-desktop.png' 240 800
New-Comparison 'figma-portfolio-mobile.png' 'portfolio-390x844.jpg' 'comparison-portfolio-mobile.png'
$bounds=Get-Content (Join-Path $captureRoot 'empty-card-bounds.json') | ConvertFrom-Json
$shot=[System.Drawing.Bitmap]::new((Join-Path $captureRoot 'portfolio-empty-390x844.jpg'));$cropped=$shot.Clone([System.Drawing.Rectangle]::new([int]$bounds.x,[int]$bounds.y,[int]$bounds.w,[int]$bounds.h),$shot.PixelFormat);$cropped.Save((Join-Path $captureRoot 'portfolio-empty-card.png'),[System.Drawing.Imaging.ImageFormat]::Png);$cropped.Dispose();$shot.Dispose()
New-Comparison 'figma-portfolio-empty.png' 'portfolio-empty-card.png' 'comparison-portfolio-empty.png'
