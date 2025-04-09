
/**
 * Normalize domains from referrers to group similar sources
 * @param referrer The original referrer URL
 * @returns The normalized referrer name
 */
export const normalizeReferrer = (referrer: string): string => {
  // List of common domains and their normalized names
  const domainMap: Record<string, string> = {
    'google': 'Google',
    'youtube': 'YouTube',
    'facebook': 'Facebook',
    'instagram': 'Instagram',
    'twitter': 'Twitter',
    'linkedin': 'LinkedIn',
    'bing': 'Bing',
    'yahoo': 'Yahoo',
    'baidu': 'Baidu',
    'pinterest': 'Pinterest',
    'reddit': 'Reddit',
    'quora': 'Quora',
    'duckduckgo': 'DuckDuckGo',
    'stackoverflow': 'Stack Overflow',
    'github': 'GitHub',
    'medium': 'Medium',
    'amazon': 'Amazon',
    'netflix': 'Netflix'
  };

  // Handle direct/none
  if (!referrer || referrer === '(direct)' || referrer === 'direct' || referrer === 'none') {
    return 'Direct';
  }

  // Extract domain from URL-like referrers
  let domain = referrer;
  if (referrer.includes('//')) {
    domain = referrer.split('//')[1].split('/')[0];
  } else if (referrer.includes('/')) {
    domain = referrer.split('/')[0];
  }

  // Remove www. if present
  domain = domain.replace(/^www\./, '');

  // Check for known domains
  for (const [key, value] of Object.entries(domainMap)) {
    if (domain.includes(key)) {
      return value;
    }
  }

  // For unknown domains, clean up and return the domain itself
  return domain.charAt(0).toUpperCase() + domain.slice(1);
};

/**
 * Remove query parameters from a URL
 * @param url The URL to clean
 * @returns URL without query parameters
 */
export const removeQueryParams = (url: string): string => {
  if (!url) return '';
  
  // Remove query parameters and fragments
  return url.split('?')[0].split('#')[0];
};
