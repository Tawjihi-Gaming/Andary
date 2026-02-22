using System;

namespace Backend.Models.Configs
{
    public class GoogleOAuthWeb
    {
        public string client_id { get; set; } = string.Empty;
        public string client_secret { get; set; } = string.Empty;
        public string[] redirect_uris { get; set; } = Array.Empty<string>();
        public string[] javascript_origins { get; set; } = Array.Empty<string>();
        public string auth_uri { get; set; } = string.Empty;
        public string token_uri { get; set; } = string.Empty;
		public string auth_provider_x509_cert_url { get; set; } = string.Empty;
    }

    public class GoogleOAuthConfig
    {
        public GoogleOAuthWeb web { get; set; } = new GoogleOAuthWeb();
    }
}
