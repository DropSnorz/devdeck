/** Fixtures shared by jwk.test.ts and JwkViewerWidget.test.tsx. All keys are
 * freshly generated for this repo and used only as parser test input — none
 * back anything real. */

export const RSA_PUBLIC_JWK = JSON.stringify({
  kty: 'RSA',
  n: 'wsCyaIij3W6RfIlEisbM2nZGhKq5yzqSMqIG1OM-djmDVr6yUb_ZKBfVUyqCHfd0bk4NlyzF-wIB1DCz9adwW0PXOoIYLr9i9CYMmvlbt6qCHO5IQ0Ms6OTCdliMZDoY64KcRIuLfhrRrRFdKk2jJ3_ApCrBS9Gpz7nH_Zm2k6PcQJNQ8Z2Fx0t5mOwcmKhUUrJcM6CJQlu4VnhNZZB1IvSD8ExsB4bDCCz1PyJMPQ4Wfny9hJbf_RqaKX7mV3vzW2bEhrud9l6aUxBPVW44LfHOAkTg0FSrupQ4XYvF7TdjBbFfM-tecso2P2FgvybWJRwprEdjWBgVrxEOgl_L-w',
  e: 'AQAB',
  alg: 'RS256',
  use: 'sig',
  kid: 'rsa-key-1',
})

export const RSA_PRIVATE_JWK = JSON.stringify({
  kty: 'RSA',
  n: 'wsCyaIij3W6RfIlEisbM2nZGhKq5yzqSMqIG1OM-djmDVr6yUb_ZKBfVUyqCHfd0bk4NlyzF-wIB1DCz9adwW0PXOoIYLr9i9CYMmvlbt6qCHO5IQ0Ms6OTCdliMZDoY64KcRIuLfhrRrRFdKk2jJ3_ApCrBS9Gpz7nH_Zm2k6PcQJNQ8Z2Fx0t5mOwcmKhUUrJcM6CJQlu4VnhNZZB1IvSD8ExsB4bDCCz1PyJMPQ4Wfny9hJbf_RqaKX7mV3vzW2bEhrud9l6aUxBPVW44LfHOAkTg0FSrupQ4XYvF7TdjBbFfM-tecso2P2FgvybWJRwprEdjWBgVrxEOgl_L-w',
  e: 'AQAB',
  d: 'I2tGRyqqmqf0P7D7TT3wnb6q_o_KMILbeefr1CXsAzZcg5c0-RcqGFeVTYXKmkaZ30HEyPy0mPz5dizRXdjw3zhMWXC1kzLtfTe6TSkSnCmfdkGD1O_PqB-KmllqVwQV6icb4n96hBm-jno89meeR529XF4GP5LHDmdcTuv4v4rY40slzRbtevghpTrG0rc9JgiuaECNBfE3ioI7EO6EamszYSMBqZ7ThvBJvn1idFFnNFf-fhKRJf8Hzf8Mj-K7NvaemF-YCQZleZ5cUuSExlp56dTqFDN8kdkd5UuSOvNwt4Pv_E7l94R8R5Ie1nWx8mSVEQcuUWs1iYm40oOTkQ',
  p: '-FgdrPj9GE2L5iAYLbHVop1ZvKEr3VKD-B0gklxkUDTwMH7Ykz7jSvQK08jPlcIvG8jGSn6duxYdSUV9qJfrzh0u4h1QH37BtKoiSaAK-DHGAN_HjNFCf2Rf3w2p0_y_pcqbrajR3slczpHldyR-oewdeNNTu09_Z1JAZI_hv_k',
  q: 'yMGlv_lMXupeEqMnDZrlVxtkr0Yv6eQnRlGpOnwRoe9V1ymT6xHefQCSD55VnRPXtVydy7SysMdIn4ssdw3H4SnRRUFQ2iUVfLHuxniQgwsHWM0z8EqkGg0vWZUY4BRi9I9Ugb-z1f7mvYZ4iBoDEet9YapRKl9hAqCd1qN3EJM',
  dp: 'aAHHU-TnYqE_gP5aAfEjjrollflN_KANQwE33fQx0uGI4laNb4V7_a0dR7snLQopXpKEcTh76JmHZGNlEBGoISdZtjsejkIw7-_88ibD0VRPH5iY4yHUnrOz7x-yy2RkAxRKhL1aP9rHMoApwO8Y1cmkQjEHNUBDFEt_Sl5z5kk',
  dq: 'drXTbjZbS5DoubqSIEBktuJy4hXtxS9tbe5h1DyDLK9aohVq60iwuFf7BpNI6s5N8mdmw4sBUvk0X2sriuayN9nDbmFWDvh4wThyChhG08ZUvNTyjneEnAcJ5b39bJuBfD246dRS4gqNpKp8YXaINDN8-6B7yEOIGMajLsWQZVM',
  qi: 'xvGeEd-Sy7_vpjpU3QFK_pkbhiui_ifRS69hSi0JZ4Q6Fd6K7zA5wCkTN0EAgtUZ1oM1Gs4_ofvuvMzUj0ZdL1mq_QUUaKswhpIA8rEjM7x8Tsz3ms-p9bqAAoZ6-rNcaL29-fvQDOf6prb1PkMxxeN0k95yyTfPAKEEUb2sf-U',
  kid: 'rsa-key-1',
})

export const EC_PUBLIC_JWK = JSON.stringify({
  kty: 'EC',
  crv: 'P-256',
  x: 'lSA3cKoXUToiP3ZEb5zhjxYK2YuUUpgIkQjr1lvwXu0',
  y: 'L-lJgnqLzuCzWOKGIdErBXWicW_1usJs8l4-wcyZh5M',
  alg: 'ES256',
  use: 'sig',
  kid: 'ec-key-1',
})

export const EC_PRIVATE_JWK = JSON.stringify({
  kty: 'EC',
  crv: 'P-256',
  x: 'lSA3cKoXUToiP3ZEb5zhjxYK2YuUUpgIkQjr1lvwXu0',
  y: 'L-lJgnqLzuCzWOKGIdErBXWicW_1usJs8l4-wcyZh5M',
  d: 'xCsuKepbZu5rq_iDkgXJISMfRM4keJ_rmu6mUgdISrs',
  kid: 'ec-key-1',
})

export const OKP_PUBLIC_JWK = JSON.stringify({
  kty: 'OKP',
  crv: 'Ed25519',
  x: 'W6ZdQmwkm0pa9D8LwCmJyMjhVRKwRVyy2ZTl_X8Yx88',
  kid: 'ed25519-key-1',
})

export const OCT_JWK = JSON.stringify({
  kty: 'oct',
  k: 'W6N-FgU5pH0r3gwzITFsArhNoYP4cuqBgD5gs5tJu-I',
  alg: 'A256GCM',
  kid: 'symmetric-key-1',
})

export const JWK_SET = JSON.stringify({
  keys: [JSON.parse(RSA_PUBLIC_JWK), JSON.parse(EC_PUBLIC_JWK)],
})

/** The RFC 7638 §3.1 worked example, used to check the thumbprint algorithm
 * against the spec's own known-answer value rather than only against
 * self-consistency. */
export const RFC7638_EXAMPLE_JWK = JSON.stringify({
  kty: 'RSA',
  n: '0vx7agoebGcQSuuPiLJXZptN9nndrQmbXEps2aiAFbWhM78LhWx4cbbfAAtVT86zwu1RK7aPFFxuhDR1L6tSoc_BJECPebWKRXjBZCiFV4n3oknjhMstn64tZ_2W-5JsGY4Hc5n9yBXArwl93lqt7_RN5w6Cf0h4QyQ5v-65YGjQR0_FDW2QvzqY368QQMicAtaSqzs8KJZgnYb9c7d0zgdAZHzu6qMQvRL5hajrn1n91CbOpbISD08qNLyrdkt-bFTWhAI4vMQFh6WeZu0fM4lFd2NcRwr3XPksINHaQ-G_xBniIqbw0Ls1jF44-csFCur-kEgU8awapJzKnqDKgw',
  e: 'AQAB',
  alg: 'RS256',
  kid: '2011-04-29',
})

export const RFC7638_EXAMPLE_THUMBPRINT = 'NzbLsXh8uDCcd-6MNwXF4W_7noWXFZAfHkxZsRGC9Xs'
