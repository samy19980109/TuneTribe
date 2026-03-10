const cookieHeader = 'spotify_verifier=12345; other_cookie=abc';
const getCookie = (name) => {
  const match = cookieHeader.match(new RegExp('(^| )' + name + '=([^;]+)'))
  return match ? decodeURIComponent(match[2]) : null
}
console.log(getCookie('spotify_verifier'));
