class Never < Formula
  desc "Never - AI Constraint Guardian"
  homepage "https://github.com/mohitmishra786/never"
  url "https://registry.npmjs.org/@mohitmishra7/never-cli/-/never-cli-0.0.4.tgz"
  sha256 "f3f43fb63d90118b877654c67cb9cca17e97a99f541fec5d039d21dd64625dbd"
  license "MIT"

  depends_on "node"

  def install
    system "npm", "install", *Language::Node.std_npm_install_args(libexec)
    bin.install_symlink Dir["#{libexec}/bin/*"]
  end

  test do
    system "#{bin}/never", "--help"
  end
end
