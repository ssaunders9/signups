/**
 * Club Calendar 101 — Configuration
 * =================================
 * Values are base64-encoded to avoid casual plaintext snooping.
 * The real values are decoded at runtime via atob().
 */

var CONFIG = (function () {
  // Base64-encoded to deter casual snooping (not cryptographic — anyone
  // with a console can decode these, but they won't appear in plaintext
  // when viewing source).
  var _enc = {
    url: 'aHR0cHM6Ly9zY3JpcHQuZ29vZ2xlLmNvbS9tYWNyb3Mvcy9BS2Z5Y2J5bTJybEpSTVdmSVVyOGotUXhMT2hjWVJWN21maEFqUDR1ekFDLW4tQmVJWlVoX2JFUlFYMHVzR09CRzg1OFZFRWdpdy9leGVj',
    key: 'Y0M3eEtwOXZSMm1ONHdMOGpGM2hRNnRZMWJBNWRHMGU='
  };

  return {
    API_BASE_URL: atob(_enc.url),
    API_KEY: atob(_enc.key)
  };
})();
