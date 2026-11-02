using Scooply.Api.Models;
namespace Scooply.Api.Services;

/// <summary>Raised for any rejected upload; controllers turn it into a 400 response.</summary>
public class UploadException : Exception { public UploadException(string m) : base(m) { } }

public interface IFileUploadService
{
    Task<string> SaveImageAsync(IFormFile file, string folder);
    void Delete(string? path);
}

/// <summary>Validates (extension, size, magic bytes), renames with a GUID and stores under wwwroot/uploads.</summary>
public class FileUploadService : IFileUploadService
{
    private readonly IWebHostEnvironment _env;
    private readonly long _max;
    private readonly HashSet<string> _allowed;

    public FileUploadService(IWebHostEnvironment env, IConfiguration cfg)
    {
        _env = env;
        _max = cfg.GetValue<long?>("Upload:MaxBytes") ?? 2 * 1024 * 1024;
        _allowed = (cfg.GetSection("Upload:Extensions").Get<string[]>() ?? new[] { ".jpg", ".jpeg", ".png", ".webp" })
            .ToHashSet(StringComparer.OrdinalIgnoreCase);
    }

    public async Task<string> SaveImageAsync(IFormFile file, string folder)
    {
        if (file == null || file.Length == 0) throw new UploadException("Please choose an image.");
        if (file.Length > _max) throw new UploadException("Image must be 2 MB or smaller.");
        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!_allowed.Contains(ext)) throw new UploadException("Only JPG, PNG or WEBP images are allowed.");

        using var ms = new MemoryStream();
        await file.CopyToAsync(ms);
        var bytes = ms.ToArray();
        if (!SignatureMatches(bytes, ext)) throw new UploadException("File content does not match an image type.");

        var root = _env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot");
        var dir = Path.Combine(root, "uploads", folder);
        Directory.CreateDirectory(dir);
        var name = $"{Guid.NewGuid():N}{ext}";                      // never trust the client file name
        await File.WriteAllBytesAsync(Path.Combine(dir, name), bytes);
        return $"/uploads/{folder}/{name}";
    }

    /// <summary>Deletes a previously uploaded file; seeded images under /images are left alone.</summary>
    public void Delete(string? path)
    {
        if (string.IsNullOrEmpty(path) || !path.StartsWith("/uploads/")) return;
        var root = _env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot");
        var full = Path.GetFullPath(Path.Combine(root, path.TrimStart('/')));
        if (full.StartsWith(Path.GetFullPath(root)) && File.Exists(full)) File.Delete(full);
    }

    /// <summary>Checks the first bytes (JPEG FFD8, PNG 89504E47, WEBP RIFF....WEBP).</summary>
    private static bool SignatureMatches(byte[] b, string ext)
    {
        if (b.Length < 12) return false;
        return ext switch
        {
            ".jpg" or ".jpeg" => b[0] == 0xFF && b[1] == 0xD8,
            ".png" => b[0] == 0x89 && b[1] == 0x50 && b[2] == 0x4E && b[3] == 0x47,
            ".webp" => b[0] == 'R' && b[1] == 'I' && b[2] == 'F' && b[3] == 'F' && b[8] == 'W' && b[9] == 'E' && b[10] == 'B' && b[11] == 'P',
            _ => false
        };
    }
}
