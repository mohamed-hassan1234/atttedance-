param(
  [string]$IpAddress = "172.20.10.2"
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$frontendDir = Resolve-Path (Join-Path $scriptDir "..")
$certDir = Join-Path $frontendDir "certs"
New-Item -ItemType Directory -Force -Path $certDir | Out-Null

$rootKeyPath = Join-Path $certDir "seams-local-root-ca-key.pem"
$rootCertPath = Join-Path $certDir "seams-local-root-ca.pem"
$rootCerPath = Join-Path $certDir "seams-local-root-ca.cer"
$serverKeyPath = Join-Path $certDir "$IpAddress-key.pem"
$serverCertPath = Join-Path $certDir "$IpAddress.pem"

$notBefore = [DateTimeOffset]::Now.AddDays(-1)
$rootNotAfter = $notBefore.AddYears(5)
$serverNotAfter = $notBefore.AddYears(2)

$rootKey = [System.Security.Cryptography.RSA]::Create(4096)
$rootRequest = [System.Security.Cryptography.X509Certificates.CertificateRequest]::new(
  "CN=SEAMS Local Development Root CA",
  $rootKey,
  [System.Security.Cryptography.HashAlgorithmName]::SHA256,
  [System.Security.Cryptography.RSASignaturePadding]::Pkcs1
)
$rootRequest.CertificateExtensions.Add(
  [System.Security.Cryptography.X509Certificates.X509BasicConstraintsExtension]::new($true, $false, 0, $true)
)
$rootRequest.CertificateExtensions.Add(
  [System.Security.Cryptography.X509Certificates.X509KeyUsageExtension]::new(
    [System.Security.Cryptography.X509Certificates.X509KeyUsageFlags]::KeyCertSign -bor
    [System.Security.Cryptography.X509Certificates.X509KeyUsageFlags]::CrlSign,
    $true
  )
)
$rootRequest.CertificateExtensions.Add(
  [System.Security.Cryptography.X509Certificates.X509SubjectKeyIdentifierExtension]::new($rootRequest.PublicKey, $false)
)
$rootCert = $rootRequest.CreateSelfSigned($notBefore, $rootNotAfter)

$serverKey = [System.Security.Cryptography.RSA]::Create(2048)
$serverRequest = [System.Security.Cryptography.X509Certificates.CertificateRequest]::new(
  "CN=$IpAddress",
  $serverKey,
  [System.Security.Cryptography.HashAlgorithmName]::SHA256,
  [System.Security.Cryptography.RSASignaturePadding]::Pkcs1
)

$sanBuilder = [System.Security.Cryptography.X509Certificates.SubjectAlternativeNameBuilder]::new()
$sanBuilder.AddIpAddress([System.Net.IPAddress]::Parse($IpAddress))
$sanBuilder.AddIpAddress([System.Net.IPAddress]::Parse("127.0.0.1"))
$sanBuilder.AddDnsName("localhost")
$serverRequest.CertificateExtensions.Add($sanBuilder.Build())
$serverRequest.CertificateExtensions.Add(
  [System.Security.Cryptography.X509Certificates.X509BasicConstraintsExtension]::new($false, $false, 0, $true)
)
$serverRequest.CertificateExtensions.Add(
  [System.Security.Cryptography.X509Certificates.X509KeyUsageExtension]::new(
    [System.Security.Cryptography.X509Certificates.X509KeyUsageFlags]::DigitalSignature -bor
    [System.Security.Cryptography.X509Certificates.X509KeyUsageFlags]::KeyEncipherment,
    $true
  )
)
$serverAuthOids = [System.Security.Cryptography.OidCollection]::new()
$null = $serverAuthOids.Add([System.Security.Cryptography.Oid]::new("1.3.6.1.5.5.7.3.1"))
$serverRequest.CertificateExtensions.Add(
  [System.Security.Cryptography.X509Certificates.X509EnhancedKeyUsageExtension]::new($serverAuthOids, $false)
)
$serverRequest.CertificateExtensions.Add(
  [System.Security.Cryptography.X509Certificates.X509SubjectKeyIdentifierExtension]::new($serverRequest.PublicKey, $false)
)

$serial = [byte[]]::new(16)
[System.Security.Cryptography.RandomNumberGenerator]::Fill($serial)
$serial[0] = $serial[0] -band 0x7F

$serverCert = $serverRequest.Create($rootCert, $notBefore, $serverNotAfter, $serial)
$serverCertWithKey = [System.Security.Cryptography.X509Certificates.RSACertificateExtensions]::CopyWithPrivateKey($serverCert, $serverKey)

[System.IO.File]::WriteAllText($rootKeyPath, $rootKey.ExportPkcs8PrivateKeyPem())
[System.IO.File]::WriteAllText($rootCertPath, $rootCert.ExportCertificatePem())
[System.IO.File]::WriteAllBytes($rootCerPath, $rootCert.Export([System.Security.Cryptography.X509Certificates.X509ContentType]::Cert))
[System.IO.File]::WriteAllText($serverKeyPath, $serverKey.ExportPkcs8PrivateKeyPem())
[System.IO.File]::WriteAllText($serverCertPath, $serverCertWithKey.ExportCertificatePem())

Write-Host "Created HTTPS certificate for $IpAddress"
Write-Host "Vite key : $serverKeyPath"
Write-Host "Vite cert: $serverCertPath"
Write-Host "Install this root certificate on the iPhone: $rootCerPath"
