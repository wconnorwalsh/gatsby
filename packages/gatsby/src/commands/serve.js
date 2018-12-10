/* @flow weak */
const openurl = require(`opn`)
const signalExit = require(`signal-exit`)
const compression = require(`compression`)
const express = require(`express`)
const getConfigFile = require(`../bootstrap/get-config-file`)
const preferDefault = require(`../bootstrap/prefer-default`)
const chalk = require(`chalk`)
const getSslCert = require(`../utils/get-ssl-cert`)
const { createServer } = require(`https`)

module.exports = async program => {
  let { prefixPaths, port, open } = program
  port = typeof port === `string` ? parseInt(port, 10) : port

  const config = await preferDefault(
    getConfigFile(program.directory, `gatsby-config`)
  )

  let pathPrefix = config && config.pathPrefix
  pathPrefix = prefixPaths && pathPrefix ? pathPrefix : `/`

  const app = express()
  const router = express.Router()
  router.use(compression())
  router.use(express.static(`public`))
  router.use((req, res, next) => {
    if (req.accepts(`html`)) {
      res.status(404).sendFile(`404.html`, { root: `public` })
    } else {
      next()
    }
  })
  app.use(pathPrefix, router)

  if (program.https) {
    program.ssl = await getSslCert({
      name: program.sitePackageJson.name,
      certFile: program[`cert-file`],
      keyFile: program[`key-file`],
      directory: program.directory,
    })
  }

  let report = protocol => {
    let openUrlString = `${protocol}://localhost:${port}${pathPrefix}`
    console.log(
      `${chalk.blue(`info`)} gatsby serve running at: ${chalk.bold(
        openUrlString
      )}`
    )
    if (open) {
      console.log(`${chalk.blue(`info`)} Opening browser...`)
      openurl(openUrlString).catch(err =>
        console.log(
          `${chalk.yellow(
            `warn`
          )} Browser not opened because no browser was found`
        )
      )
    }
  }

  let server

  if (program.ssl) {
    server = createServer(program.ssl, app).listen(port, report(`https`))
  } else {
    server = app.listen(port, report(`http`))
  }

  signalExit((code, signal) => {
    server.close()
  })
}
