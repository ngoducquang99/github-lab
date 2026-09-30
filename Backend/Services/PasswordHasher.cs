using System.Security.Cryptography;
using System.Text;

namespace Backend.Services;

/// <summary>Băm mật khẩu bằng SHA-256 + salt ngẫu nhiên (không lưu mật khẩu thô).</summary>
public static class PasswordHasher
{
    public static (string Hash, string Salt) Hash(string password)
    {
        var saltBytes = RandomNumberGenerator.GetBytes(16);
        var salt = Convert.ToBase64String(saltBytes);
        return (ComputeHash(password, salt), salt);
    }

    public static bool Verify(string password, string hash, string salt)
        => ComputeHash(password, salt) == hash;

    private static string ComputeHash(string password, string salt)
    {
        var bytes = Encoding.UTF8.GetBytes(salt + "::" + password);
        var hashed = SHA256.HashData(bytes);
        return Convert.ToBase64String(hashed);
    }
}