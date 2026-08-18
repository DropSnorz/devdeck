/** Object identifiers commonly seen in X.509 certificates, mapped to the
 * short/human names most viewers display. Not exhaustive — anything missing
 * falls back to showing the raw dotted OID, which is always a valid (if
 * less friendly) thing to display. */
export const OID_NAMES: Record<string, string> = {
  // RDN attribute types (subject/issuer)
  '2.5.4.3': 'CN',
  '2.5.4.5': 'serialNumber',
  '2.5.4.6': 'C',
  '2.5.4.7': 'L',
  '2.5.4.8': 'ST',
  '2.5.4.9': 'streetAddress',
  '2.5.4.10': 'O',
  '2.5.4.11': 'OU',
  '2.5.4.12': 'title',
  '2.5.4.15': 'businessCategory',
  '2.5.4.17': 'postalCode',
  '2.5.4.42': 'GN',
  '2.5.4.43': 'initials',
  '2.5.4.44': 'generationQualifier',
  '2.5.4.46': 'dnQualifier',
  '2.5.4.4': 'SN',
  '1.2.840.113549.1.9.1': 'emailAddress',
  '0.9.2342.19200300.100.1.25': 'DC',
  '0.9.2342.19200300.100.1.1': 'UID',
  '2.5.4.97': 'organizationIdentifier',
  '1.3.6.1.4.1.311.60.2.1.3': 'jurisdictionC',
  '1.3.6.1.4.1.311.60.2.1.2': 'jurisdictionST',
  '1.3.6.1.4.1.311.60.2.1.1': 'jurisdictionL',

  // Signature / public key algorithms
  '1.2.840.113549.1.1.1': 'rsaEncryption',
  '1.2.840.113549.1.1.5': 'sha1WithRSAEncryption',
  '1.2.840.113549.1.1.11': 'sha256WithRSAEncryption',
  '1.2.840.113549.1.1.12': 'sha384WithRSAEncryption',
  '1.2.840.113549.1.1.13': 'sha512WithRSAEncryption',
  '1.2.840.113549.1.1.10': 'rsassaPss',
  '1.2.840.10040.4.1': 'dsa',
  '1.2.840.10040.4.3': 'dsaWithSha1',
  '1.2.840.10045.2.1': 'ecPublicKey',
  '1.2.840.10045.4.1': 'ecdsaWithSHA1',
  '1.2.840.10045.4.3.1': 'ecdsaWithSHA224',
  '1.2.840.10045.4.3.2': 'ecdsaWithSHA256',
  '1.2.840.10045.4.3.3': 'ecdsaWithSHA384',
  '1.2.840.10045.4.3.4': 'ecdsaWithSHA512',
  '1.3.101.112': 'Ed25519',
  '1.3.101.113': 'Ed448',

  // Named elliptic curves (subjectPublicKeyInfo algorithm parameters)
  '1.2.840.10045.3.1.7': 'P-256',
  '1.3.132.0.34': 'P-384',
  '1.3.132.0.35': 'P-521',
  '1.3.132.0.10': 'secp256k1',

  // Standard v3 extensions
  '2.5.29.14': 'subjectKeyIdentifier',
  '2.5.29.15': 'keyUsage',
  '2.5.29.17': 'subjectAltName',
  '2.5.29.18': 'issuerAltName',
  '2.5.29.19': 'basicConstraints',
  '2.5.29.31': 'cRLDistributionPoints',
  '2.5.29.32': 'certificatePolicies',
  '2.5.29.35': 'authorityKeyIdentifier',
  '2.5.29.37': 'extKeyUsage',
  '1.3.6.1.5.5.7.1.1': 'authorityInfoAccess',
  '1.3.6.1.5.5.7.1.11': 'subjectInfoAccess',
  '1.3.6.1.4.1.11129.2.4.2': 'certificateTransparencySCTs',

  // Extended key usages
  '1.3.6.1.5.5.7.3.1': 'serverAuth',
  '1.3.6.1.5.5.7.3.2': 'clientAuth',
  '1.3.6.1.5.5.7.3.3': 'codeSigning',
  '1.3.6.1.5.5.7.3.4': 'emailProtection',
  '1.3.6.1.5.5.7.3.8': 'timeStamping',
  '1.3.6.1.5.5.7.3.9': 'OCSPSigning',

  // authorityInfoAccess / subjectInfoAccess methods
  '1.3.6.1.5.5.7.48.1': 'OCSP',
  '1.3.6.1.5.5.7.48.2': 'caIssuers',
}

export function describeOid(oid: string): string {
  return OID_NAMES[oid] ?? oid
}
