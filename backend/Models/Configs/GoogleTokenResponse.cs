using System;

namespace Backend.Models.Configs
{
    public class GoogleTokenResponse
    {
        public string access_token { get; set; } = string.Empty;
        public string expires_in { get; set; } = string.Empty;
        public string id_token { get; set; } = string.Empty;
        public string refresh_token { get; set; } = string.Empty;
        public string scope { get; set; } = string.Empty;
        public string token_type { get; set; } = string.Empty;
    }
}
