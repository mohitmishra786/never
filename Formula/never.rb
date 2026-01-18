class Never < Formula
  desc "Never - AI Constraint Guardian"
  homepage "https://github.com/mohitmishra786/never"
  url "https://registry.npmjs.org/@mohitmishra7/never-cli/-/never-cli-0.0.5.tgz"
  sha256 "2c99f8960e936f7941cdff2f22ae6aa6339ea769513df11e36239a2a9809c744"
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
