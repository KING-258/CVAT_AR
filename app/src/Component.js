"use client"

import { useEffect, useRef, useState } from "react"
import * as THREE from "three"
import "./style.css"

export const Component = () => {
  const canvasRef = useRef(null)
  const [speed, setSpeed] = useState(10)
  const [direction, setDirection] = useState("N")
  const [directionDegrees, setDirectionDegrees] = useState(0)
  const [acceleration, setAcceleration] = useState(15)
  const [brake, setBrake] = useState(0)
  const [currentTrack, setCurrentTrack] = useState("city")
  const [isLoading, setIsLoading] = useState(true)
  const [boostAvailable, setBoostAvailable] = useState(75)
  const videoRef = useRef(null);
  const sceneRef = useRef(null)
  const cameraRef = useRef(null)
  const rendererRef = useRef(null)
  const carRef = useRef(null)
  const controlsRef = useRef(null)
  const animationFrameRef = useRef(null)
  const keysPressed = useRef({})
  const minimapRef = useRef(null)
  const minimapRendererRef = useRef(null)
  const minimapCameraRef = useRef(null)
  const tracks = {
    city: {
      groundColor: 0x1a5276,
      skyColor: 0x0a0a0a,
      ambientLight: 0.5,
      fogColor: 0x1a1a2e,
      fogDensity: 0.02,
    },
    mountain: {
      groundColor: 0x2ecc71,
      skyColor: 0x2c3e50,
      ambientLight: 0.7,
      fogColor: 0x4a6572,
      fogDensity: 0.01,
    },
    desert: {
      groundColor: 0xf39c12,
      skyColor: 0xf5b041,
      ambientLight: 1.0,
      fogColor: 0xf5deb3,
      fogDensity: 0.005,
    },
  }
  useEffect(() => {
    if (!canvasRef.current) return
    const scene = new THREE.Scene()
    sceneRef.current = scene
    applyTrackSettings(currentTrack)
    const camera = new THREE.PerspectiveCamera(
      75,
      canvasRef.current.clientWidth / canvasRef.current.clientHeight,
      0.1,
      1000,
    )
    camera.position.set(0, 5, 10)
    cameraRef.current = camera
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
    })
    renderer.setSize(canvasRef.current.clientWidth, canvasRef.current.clientHeight)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    rendererRef.current = renderer
    const ambientLight = new THREE.AmbientLight(0x404040, tracks[currentTrack].ambientLight)
    scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
    directionalLight.position.set(5, 10, 7.5)
    directionalLight.castShadow = true
    directionalLight.shadow.mapSize.width = 1024
    directionalLight.shadow.mapSize.height = 1024
    scene.add(directionalLight)
    createGround()
    createRoad()
    createCar()
    createMinimap()
    window.addEventListener("resize", handleResize)
    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)
    animate()
    setTimeout(() => setIsLoading(false), 1000)
    return () => {
      window.removeEventListener("resize", handleResize)
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (rendererRef.current) {
        rendererRef.current.dispose()
      }
      if (minimapRendererRef.current) {
        minimapRendererRef.current.dispose()
      }
      if (sceneRef.current) {
        while (sceneRef.current.children.length > 0) {
          const object = sceneRef.current.children[0]
          if (object.geometry) object.geometry.dispose()
          if (object.material) {
            if (Array.isArray(object.material)) {
              object.material.forEach((material) => material.dispose())
            } else {
              object.material.dispose()
            }
          }
          sceneRef.current.remove(object)
        }
      }
    }
  }, [])
  useEffect(() => {
    if (!sceneRef.current) return
    applyTrackSettings(currentTrack)
  }, [currentTrack])
  const applyTrackSettings = (trackType) => {
    if (!sceneRef.current) return

    const track = tracks[trackType]
    sceneRef.current.background = new THREE.Color(track.skyColor)
    sceneRef.current.fog = new THREE.FogExp2(track.fogColor, track.fogDensity)
    const ground = sceneRef.current.getObjectByName("ground")
    if (ground && ground.material) {
      ground.material.color.set(track.groundColor)
    }
    addTrackDecorations(trackType)
  }
  const createGround = () => {
    if (!sceneRef.current) return

    const groundGeometry = new THREE.PlaneGeometry(1000, 1000)
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: tracks[currentTrack].groundColor,
      roughness: 0.8,
      metalness: 0.2,
    })

    const ground = new THREE.Mesh(groundGeometry, groundMaterial)
    ground.rotation.x = -Math.PI / 2
    ground.position.y = -1
    ground.receiveShadow = true
    ground.name = "ground"

    sceneRef.current.add(ground)
  }
  const createRoad = () => {
    if (!sceneRef.current) return
    const roadGeometry = new THREE.PlaneGeometry(10, 1000)
    const roadMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 })
    const road = new THREE.Mesh(roadGeometry, roadMaterial)
    road.rotation.x = -Math.PI / 2
    road.position.y = -0.9
    road.receiveShadow = true
    road.name = "road"
    sceneRef.current.add(road)
    const lineGeometry = new THREE.PlaneGeometry(0.2, 1000)
    const lineMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff })
    const centerLine = new THREE.Mesh(lineGeometry, lineMaterial)
    centerLine.rotation.x = -Math.PI / 2
    centerLine.position.y = -0.89
    centerLine.receiveShadow = true
    sceneRef.current.add(centerLine)
    const leftLineGeometry = new THREE.PlaneGeometry(0.2, 1000)
    const leftLineMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff })
    const leftLine = new THREE.Mesh(leftLineGeometry, leftLineMaterial)
    leftLine.rotation.x = -Math.PI / 2
    leftLine.position.set(-4.5, -0.89, 0)
    leftLine.receiveShadow = true
    sceneRef.current.add(leftLine)
    const rightLineGeometry = new THREE.PlaneGeometry(0.2, 1000)
    const rightLineMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff })
    const rightLine = new THREE.Mesh(rightLineGeometry, rightLineMaterial)
    rightLine.rotation.x = -Math.PI / 2
    rightLine.position.set(4.5, -0.89, 0)
    rightLine.receiveShadow = true

    sceneRef.current.add(rightLine)
  }
  const createCar = () => {
    if (!sceneRef.current) return

    const carGroup = new THREE.Group()
    carGroup.name = "car"
    const bodyGeometry = new THREE.BoxGeometry(2, 0.5, 4)
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0x3b82f6,
      metalness: 0.6,
      roughness: 0.2,
    })
    const carBody = new THREE.Mesh(bodyGeometry, bodyMaterial)
    carBody.position.y = 0.5
    carBody.castShadow = true
    carBody.receiveShadow = true
    carGroup.add(carBody)
    const cabinGeometry = new THREE.BoxGeometry(1.5, 0.6, 2)
    const cabinMaterial = new THREE.MeshStandardMaterial({
      color: 0x2c3e50,
      transparent: true,
      opacity: 0.7,
      metalness: 0.7,
      roughness: 0.2,
    })
    const carCabin = new THREE.Mesh(cabinGeometry, cabinMaterial)
    carCabin.position.set(0, 1.1, -0.5)
    carCabin.castShadow = true
    carCabin.receiveShadow = true
    carGroup.add(carCabin)
    const windshieldGeometry = new THREE.BoxGeometry(1.4, 0.01, 0.8)
    const windshieldMaterial = new THREE.MeshStandardMaterial({
      color: 0xa3e0ff,
      metalness: 0.9,
      roughness: 0.1,
      transparent: true,
      opacity: 0.7,
    })
    const windshield = new THREE.Mesh(windshieldGeometry, windshieldMaterial)
    windshield.position.set(0, 1.2, 0.5)
    windshield.rotation.x = Math.PI / 6
    carGroup.add(windshield)
    const wheelGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.2, 32)
    const wheelMaterial = new THREE.MeshStandardMaterial({
      color: 0x333333,
      metalness: 0.5,
      roughness: 0.7,
    })

    const wheelPositions = [
      { x: -1, y: 0.4, z: 1.2 },
      { x: 1, y: 0.4, z: 1.2 }, 
      { x: -1, y: 0.4, z: -1.2 },
      { x: 1, y: 0.4, z: -1.2 },
    ]
    wheelPositions.forEach((pos, index) => {
      const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial)
      wheel.rotation.z = Math.PI / 2
      wheel.position.set(pos.x, pos.y, pos.z)
      wheel.castShadow = true
      wheel.receiveShadow = true
      wheel.name = `wheel_${index}`
      carGroup.add(wheel)

      const hubGeometry = new THREE.CylinderGeometry(0.15, 0.15, 0.05, 16)
      const hubMaterial = new THREE.MeshStandardMaterial({
        color: 0x888888,
        metalness: 0.8,
        roughness: 0.2,
      })
      const hub = new THREE.Mesh(hubGeometry, hubMaterial)
      hub.rotation.x = Math.PI / 2

      if (pos.x > 0) {
        hub.position.set(0.11, 0, 0)
      } else {
        hub.position.set(-0.11, 0, 0)
      }

      wheel.add(hub)
    })

    const headlightGeometry = new THREE.SphereGeometry(0.2, 16, 16)
    const headlightMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffff00,
      emissiveIntensity: 2,
    })

    const leftHeadlight = new THREE.Mesh(headlightGeometry, headlightMaterial)
    leftHeadlight.position.set(-0.6, 0.5, 2)
    carGroup.add(leftHeadlight)

    const rightHeadlight = new THREE.Mesh(headlightGeometry, headlightMaterial)
    rightHeadlight.position.set(0.6, 0.5, 2)
    carGroup.add(rightHeadlight)

    const taillightGeometry = new THREE.SphereGeometry(0.15, 16, 16)
    const taillightMaterial = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      emissive: 0xff0000,
      emissiveIntensity: 1,
    })

    const leftTaillight = new THREE.Mesh(taillightGeometry, taillightMaterial)
    leftTaillight.position.set(-0.6, 0.5, -2)
    leftTaillight.name = "leftTaillight"
    carGroup.add(leftTaillight)

    const rightTaillight = new THREE.Mesh(taillightGeometry, taillightMaterial)
    rightTaillight.position.set(0.6, 0.5, -2)
    rightTaillight.name = "rightTaillight"
    carGroup.add(rightTaillight)

    sceneRef.current.add(carGroup)
    carRef.current = carGroup

    carGroup.position.set(0, 0, 0)
    carGroup.rotation.y = Math.PI
  }
  const createMinimap = () => {
    const minimapContainer = document.createElement("div")
    minimapContainer.style.position = "absolute"
    minimapContainer.style.bottom = "20px"
    minimapContainer.style.left = "20px"
    minimapContainer.style.width = "150px"
    minimapContainer.style.height = "150px"
    minimapContainer.style.backgroundColor = "rgba(0, 0, 0, 0.5)"
    minimapContainer.style.borderRadius = "5px"
    minimapContainer.style.overflow = "hidden"
    minimapContainer.style.border = "1px solid rgba(255, 255, 255, 0.2)"
    minimapContainer.style.zIndex = "1000"

    const minimapCanvas = document.createElement("canvas")
    minimapCanvas.style.width = "100%"
    minimapCanvas.style.height = "100%"
    minimapContainer.appendChild(minimapCanvas)

    document.querySelector("#carSimulationCanvas").parentNode.appendChild(minimapContainer)

    const minimapRenderer = new THREE.WebGLRenderer({
      canvas: minimapCanvas,
      antialias: true,
      alpha: true,
    })
    minimapRenderer.setSize(150, 150)
    minimapRendererRef.current = minimapRenderer

    const minimapCamera = new THREE.OrthographicCamera(-50, 50, 50, -50, 1, 1000)
    minimapCamera.position.set(0, 100, 0)
    minimapCamera.lookAt(0, 0, 0)
    minimapCamera.rotation.z = Math.PI
    minimapCameraRef.current = minimapCamera
    minimapRef.current = {
      container: minimapContainer,
      canvas: minimapCanvas,
      renderer: minimapRenderer,
      camera: minimapCamera,
    }
  }
  const addTrackDecorations = (trackType) => {
    if (!sceneRef.current) return
    const existingDecorations = sceneRef.current.getObjectByName("trackDecorations")
    if (existingDecorations) {
      sceneRef.current.remove(existingDecorations)
    }

    const decorationsGroup = new THREE.Group()
    decorationsGroup.name = "trackDecorations"

    switch (trackType) {
      case "city":
        for (let i = -10; i <= 10; i += 2) {
          for (const side of [-1, 1]) {
            const height = 5 + Math.random() * 15
            const width = 3 + Math.random() * 2
            const depth = 3 + Math.random() * 2

            const buildingGeometry = new THREE.BoxGeometry(width, height, depth)
            const buildingMaterial = new THREE.MeshStandardMaterial({
              color: new THREE.Color(0.2 + Math.random() * 0.1, 0.2 + Math.random() * 0.1, 0.3 + Math.random() * 0.1),
              roughness: 0.7,
              metalness: 0.2,
            })

            const building = new THREE.Mesh(buildingGeometry, buildingMaterial)
            building.position.set(side * (10 + Math.random() * 5), height / 2 - 1, i * 10)
            building.castShadow = true
            building.receiveShadow = true

            decorationsGroup.add(building)
          }
        }

        for (let i = -20; i <= 20; i += 4) {
          for (const side of [-1, 1]) {
            const poleGeometry = new THREE.CylinderGeometry(0.1, 0.1, 4, 8)
            const poleMaterial = new THREE.MeshStandardMaterial({ color: 0x888888 })
            const pole = new THREE.Mesh(poleGeometry, poleMaterial)
            pole.position.set(side * 6, 1, i * 5)
            pole.castShadow = true

            const lightGeometry = new THREE.SphereGeometry(0.2, 16, 16)
            const lightMaterial = new THREE.MeshStandardMaterial({
              color: 0xffffff,
              emissive: 0xffffcc,
              emissiveIntensity: 2,
            })
            const light = new THREE.Mesh(lightGeometry, lightMaterial)
            light.position.set(0, 2, 0)
            pole.add(light)

            const pointLight = new THREE.PointLight(0xffffcc, 0.5, 10)
            pointLight.position.set(0, 2, 0)
            pole.add(pointLight)

            decorationsGroup.add(pole)
          }
        }
        break

      case "mountain":
        for (let i = -10; i <= 10; i += 1) {
          for (let j = -10; j <= 10; j += 1) {
            if (Math.abs(i) < 3 && Math.abs(j) < 20) continue

            const height = 5 + Math.random() * 20
            if (Math.random() > 0.8) {
              const mountainGeometry = new THREE.ConeGeometry(
                5 + Math.random() * 5,
                height,
                4 + Math.floor(Math.random() * 4),
              )
              const mountainMaterial = new THREE.MeshStandardMaterial({
                color: new THREE.Color(0.1 + Math.random() * 0.1, 0.3 + Math.random() * 0.2, 0.1 + Math.random() * 0.1),
                roughness: 0.9,
                metalness: 0.1,
              })

              const mountain = new THREE.Mesh(mountainGeometry, mountainMaterial)
              mountain.position.set(i * 10, height / 2 - 1, j * 20)
              mountain.castShadow = true
              mountain.receiveShadow = true

              decorationsGroup.add(mountain)
            }
          }
        }
        for (let i = -20; i <= 20; i++) {
          for (const side of [-1, 1]) {
            if (Math.random() > 0.7) {
              const trunkGeometry = new THREE.CylinderGeometry(0.2, 0.3, 2, 8)
              const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x8b4513 })
              const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial)
              trunk.position.set(side * (7 + Math.random() * 10), 0, i * 5)
              trunk.castShadow = true

              const leavesGeometry = new THREE.ConeGeometry(1, 3, 8)
              const leavesMaterial = new THREE.MeshStandardMaterial({
                color: 0x2ecc71,
                roughness: 0.8,
              })
              const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial)
              leaves.position.set(0, 2, 0)
              leaves.castShadow = true
              trunk.add(leaves)

              decorationsGroup.add(trunk)
            }
          }
        }
        break

      case "desert":
        for (let i = -20; i <= 20; i++) {
          for (const side of [-1, 1]) {
            if (Math.random() > 0.8) {
              const cactusGeometry = new THREE.CylinderGeometry(0.3, 0.4, 2 + Math.random() * 3, 8)
              const cactusMaterial = new THREE.MeshStandardMaterial({ color: 0x2d6a4f })
              const cactus = new THREE.Mesh(cactusGeometry, cactusMaterial)
              cactus.position.set(side * (8 + Math.random() * 15), 1, i * 5)
              cactus.castShadow = true

              if (Math.random() > 0.5) {
                const armGeometry = new THREE.CylinderGeometry(0.2, 0.2, 1, 8)
                const arm = new THREE.Mesh(armGeometry, cactusMaterial)
                arm.position.set(0.5, 0.5, 0)
                arm.rotation.z = Math.PI / 2
                cactus.add(arm)
              }

              decorationsGroup.add(cactus)
            }
          }
        }

        for (let i = -20; i <= 20; i++) {
          for (const side of [-1, 1]) {
            if (Math.random() > 0.7) {
              const rockGeometry = new THREE.DodecahedronGeometry(1 + Math.random() * 2, 0)
              const rockMaterial = new THREE.MeshStandardMaterial({
                color: 0xa89968,
                roughness: 0.9,
              })
              const rock = new THREE.Mesh(rockGeometry, rockMaterial)
              rock.position.set(side * (10 + Math.random() * 10), 0, i * 5)
              rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI)
              rock.castShadow = true
              rock.receiveShadow = true

              decorationsGroup.add(rock)
            }
          }
        }

        for (let i = -10; i <= 10; i++) {
          for (let j = -10; j <= 10; j++) {
            if (Math.abs(i) < 3) continue

            if (Math.random() > 0.8) {
              const duneGeometry = new THREE.SphereGeometry(5 + Math.random() * 5, 7, 7, 0, Math.PI * 2, 0, Math.PI / 2)
              const duneMaterial = new THREE.MeshStandardMaterial({
                color: 0xf5deb3,
                roughness: 1.0,
                metalness: 0.0,
              })

              const dune = new THREE.Mesh(duneGeometry, duneMaterial)
              dune.position.set(i * 15, -1, j * 20)
              dune.receiveShadow = true

              decorationsGroup.add(dune)
            }
          }
        }
        break
    }

    sceneRef.current.add(decorationsGroup)
  }
  const handleResize = () => {
    if (!canvasRef.current || !cameraRef.current || !rendererRef.current) return

    const width = canvasRef.current.clientWidth
    const height = canvasRef.current.clientHeight

    if (canvasRef.current && rendererRef.current) {
      const parent = canvasRef.current.parentElement
      const width = parent.clientWidth
      const height = parent.clientHeight

      cameraRef.current.aspect = width / height
      cameraRef.current.updateProjectionMatrix()

      rendererRef.current.setSize(width, height, false)
    }

    cameraRef.current.aspect = width / height
    cameraRef.current.updateProjectionMatrix()

    rendererRef.current.setSize(width, height)
  }
  const handleKeyDown = (event) => {
    keysPressed.current[event.key.toLowerCase()] = true
  }
  const handleKeyUp = (event) => {
    keysPressed.current[event.key.toLowerCase()] = false
  }
  const animate = () => {
    animationFrameRef.current = requestAnimationFrame(animate)

    if (!sceneRef.current || !cameraRef.current || !rendererRef.current || !carRef.current) return
    updateCarControls()
    updateCamera()
    rendererRef.current.render(sceneRef.current, cameraRef.current)
    if (minimapRef.current && minimapRendererRef.current && minimapCameraRef.current) {
      minimapRendererRef.current.render(sceneRef.current, minimapCameraRef.current)
      if (carRef.current) {
        minimapCameraRef.current.position.x = carRef.current.position.x
        minimapCameraRef.current.position.z = carRef.current.position.z
      }
    }
  }
  const updateCarControls = () => {
    if (!carRef.current) return
    let currentSpeed = speed
    let currentAcceleration = acceleration
    let currentBrake = brake
    const currentDirection = carRef.current.rotation.y
    if (keysPressed.current["w"] || keysPressed.current["arrowup"]) {
      const accelerationIncrease = 2 + currentAcceleration / 25
      currentAcceleration = Math.min(currentAcceleration + accelerationIncrease, 100)
      currentBrake = Math.max(currentBrake - 5, 0)
    } else if (keysPressed.current["s"] || keysPressed.current["arrowdown"]) {
      currentBrake = Math.min(currentBrake + 5, 100)
      currentAcceleration = Math.max(currentAcceleration - 2, 0)
    } else {
      currentAcceleration = Math.max(currentAcceleration - 1, 0)
    }

    if (keysPressed.current["a"] || keysPressed.current["arrowleft"]) {
      carRef.current.rotation.y += 0.03 * (currentSpeed / 50 + 0.5)
    }

    if (keysPressed.current["d"] || keysPressed.current["arrowright"]) {
      carRef.current.rotation.y -= 0.03 * (currentSpeed / 50 + 0.5)
    }
    const accelerationFactor = currentAcceleration / 100
    const brakeFactor = currentBrake / 100

    const targetSpeed = accelerationFactor * 100 * (1 - brakeFactor)

    if (currentSpeed < targetSpeed) {
      const accelerationRate = 0.5 + accelerationFactor * 0.5 + currentSpeed / 200
      currentSpeed += accelerationRate
    } else if (currentSpeed > targetSpeed) {
      const decelerationRate = brakeFactor > 0.1 ? 2 : 1
      currentSpeed -= decelerationRate
    }
    currentSpeed = Math.max(0, Math.min(currentSpeed, 100))

    const moveDistance = currentSpeed * 0.01
    carRef.current.position.x -= Math.sin(carRef.current.rotation.y) * moveDistance
    carRef.current.position.z -= Math.cos(carRef.current.rotation.y) * moveDistance

    const wheels = [
      carRef.current.getObjectByName("wheel_0"),
      carRef.current.getObjectByName("wheel_1"),
      carRef.current.getObjectByName("wheel_2"),
      carRef.current.getObjectByName("wheel_3"),
    ]

    wheels.forEach((wheel) => {
      if (wheel) {
        wheel.rotation.x += currentSpeed * 0.01
      }
    })
    const leftTaillight = carRef.current.getObjectByName("leftTaillight")
    const rightTaillight = carRef.current.getObjectByName("rightTaillight")

    if (leftTaillight && leftTaillight.material) {
      leftTaillight.material.emissiveIntensity = brakeFactor * 5 + 1
    }

    if (rightTaillight && rightTaillight.material) {
      rightTaillight.material.emissiveIntensity = brakeFactor * 5 + 1
    }






    setSpeed(Math.round(currentSpeed))
    setAcceleration(currentAcceleration)              /// will not work
    setBrake(currentBrake)

    
    
    
    
    
    
    
    const directionAngle = ((carRef.current.rotation.y * 180) / Math.PI) % 360
    const normalizedAngle = directionAngle < 0 ? directionAngle + 360 : directionAngle

    let directionLabel = "N"
    if (normalizedAngle >= 22.5 && normalizedAngle < 67.5) {
      directionLabel = "NW"
    } else if (normalizedAngle >= 67.5 && normalizedAngle < 112.5) {
      directionLabel = "W"
    } else if (normalizedAngle >= 112.5 && normalizedAngle < 157.5) {
      directionLabel = "SW"
    } else if (normalizedAngle >= 157.5 && normalizedAngle < 202.5) {
      directionLabel = "S"
    } else if (normalizedAngle >= 202.5 && normalizedAngle < 247.5) {
      directionLabel = "SE"
    } else if (normalizedAngle >= 247.5 && normalizedAngle < 292.5) {
      directionLabel = "E"
    } else if (normalizedAngle >= 292.5 && normalizedAngle < 337.5) {
      directionLabel = "NE"
    }

    setDirection(directionLabel)
    setDirectionDegrees(Math.round(normalizedAngle))

    // Update boost
    if (currentSpeed > 80 && boostAvailable > 0) {
      setBoostAvailable((prev) => Math.max(0, prev - 0.2))
    } else if (currentSpeed < 50 && boostAvailable < 100) {
      setBoostAvailable((prev) => Math.min(100, prev + 0.1))
    }
  }

  // Update camera to follow car
  const updateCamera = () => {
    if (!carRef.current || !cameraRef.current) return

    // Calculate camera position based on car position and rotation
    const cameraOffset = new THREE.Vector3(0, 5, 10)
    cameraOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), carRef.current.rotation.y)

    const targetCameraPosition = new THREE.Vector3().copy(carRef.current.position).add(cameraOffset)

    // Smoothly interpolate camera position
    cameraRef.current.position.lerp(targetCameraPosition, 0.1)

    // Look at car
    cameraRef.current.lookAt(carRef.current.position)
  }

  // Handle UI button clicks
  const handleAccelerateClick = (isPressed) => {
    keysPressed.current["w"] = isPressed
  }

  const handleBrakeClick = (isPressed) => {
    keysPressed.current["s"] = isPressed
  }

  const handleLeftClick = (isPressed) => {
    keysPressed.current["a"] = isPressed
  }

  const handleRightClick = (isPressed) => {
    keysPressed.current["d"] = isPressed
  }

  const handleTrackChange = (track) => {
    setIsLoading(true)
    setCurrentTrack(track)
    setTimeout(() => setIsLoading(false), 1000)
  }

  return (
    <div id="webcrumbs" className="w-full h-full">
      <div className="w-full h-full bg-[#0f172a] text-white font-sans overflow-hidden flex">
        <div className="w-3/5 h-full relative">
          <div className="absolute top-0 left-0 w-full h-full bg-black rounded-lg overflow-hidden">
            {/* 3D Simulation Canvas */}
            <div className="w-full h-full bg-gradient-to-b from-gray-900 to-black rounded-lg relative">
              <canvas ref={canvasRef} id="carSimulationCanvas" className="w-full h-full"></canvas>
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <svg
                    className="animate-pulse"
                    width="120"
                    height="120"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M12 2L2 7L12 12L22 7L12 2Z"
                      stroke="#3b82f6"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M2 17L12 22L22 17"
                      stroke="#3b82f6"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M2 12L12 17L22 12"
                      stroke="#3b82f6"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              )}
            </div>

            {/* Controls Overlay */}
            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-slate-800/80 backdrop-blur-sm rounded-full px-4 py-2 flex space-x-3 border border-slate-700">
              <div className="flex space-x-2">
                <div
                  className="w-8 h-8 bg-slate-700 hover:bg-slate-600 rounded-full flex items-center justify-center transition-all cursor-pointer group"
                  onMouseDown={() => handleBrakeClick(true)}
                  onMouseUp={() => handleBrakeClick(false)}
                  onMouseLeave={() => handleBrakeClick(false)}
                  onTouchStart={() => handleBrakeClick(true)}
                  onTouchEnd={() => handleBrakeClick(false)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M19 12H5"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="group-hover:stroke-[#3b82f6]"
                    />
                  </svg>
                </div>
                <div
                  className="w-8 h-8 bg-[#3b82f6] hover:bg-[#2563eb] rounded-full flex items-center justify-center transition-all cursor-pointer"
                  onMouseDown={() => handleAccelerateClick(true)}
                  onMouseUp={() => handleAccelerateClick(false)}
                  onMouseLeave={() => handleAccelerateClick(false)}
                  onTouchStart={() => handleAccelerateClick(true)}
                  onTouchEnd={() => handleAccelerateClick(false)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5 12H19" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M12 5V19" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
              <div className="h-8 w-px bg-slate-700"></div>
              <div className="flex space-x-2">
                <div
                  className="w-8 h-8 bg-slate-700 hover:bg-slate-600 rounded-full flex items-center justify-center transition-all cursor-pointer group"
                  onMouseDown={() => handleAccelerateClick(true)}
                  onMouseUp={() => handleAccelerateClick(false)}
                  onMouseLeave={() => handleAccelerateClick(false)}
                  onTouchStart={() => handleAccelerateClick(true)}
                  onTouchEnd={() => handleAccelerateClick(false)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M12 19L12 5"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="group-hover:stroke-[#3b82f6]"
                    />
                    <path
                      d="M5 12L12 5L19 12"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="group-hover:stroke-[#3b82f6]"
                    />
                  </svg>
                </div>
                <div
                  className="w-8 h-8 bg-slate-700 hover:bg-slate-600 rounded-full flex items-center justify-center transition-all cursor-pointer group"
                  onMouseDown={() => handleBrakeClick(true)}
                  onMouseUp={() => handleBrakeClick(false)}
                  onMouseLeave={() => handleBrakeClick(false)}
                  onTouchStart={() => handleBrakeClick(true)}
                  onTouchEnd={() => handleBrakeClick(false)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M12 5L12 19"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="group-hover:stroke-[#3b82f6]"
                    />
                    <path
                      d="M19 12L12 19L5 12"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="group-hover:stroke-[#3b82f6]"
                    />
                  </svg>
                </div>
                <div
                  className="w-8 h-8 bg-slate-700 hover:bg-slate-600 rounded-full flex items-center justify-center transition-all cursor-pointer group"
                  onMouseDown={() => handleLeftClick(true)}
                  onMouseUp={() => handleLeftClick(false)}
                  onMouseLeave={() => handleLeftClick(false)}
                  onTouchStart={() => handleLeftClick(true)}
                  onTouchEnd={() => handleLeftClick(false)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M19 12L5 12"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="group-hover:stroke-[#3b82f6]"
                    />
                    <path
                      d="M12 5L5 12L12 19"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="group-hover:stroke-[#3b82f6]"
                    />
                  </svg>
                </div>
                <div
                  className="w-8 h-8 bg-slate-700 hover:bg-slate-600 rounded-full flex items-center justify-center transition-all cursor-pointer group"
                  onMouseDown={() => handleRightClick(true)}
                  onMouseUp={() => handleRightClick(false)}
                  onMouseLeave={() => handleRightClick(false)}
                  onTouchStart={() => handleRightClick(true)}
                  onTouchEnd={() => handleRightClick(false)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M5 12L19 12"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="group-hover:stroke-[#3b82f6]"
                    />
                    <path
                      d="M12 19L19 12L12 5"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="group-hover:stroke-[#3b82f6]"
                    />
                  </svg>
                </div>
              </div>
            </div>

            {/* Keyboard Controls Guide */}
            <div className="absolute top-6 left-6 bg-slate-800/80 backdrop-blur-sm rounded-lg p-3 border border-slate-700">
              <div className="text-xs text-slate-400 mb-2">Keyboard Controls</div>
              <div className="flex space-x-1">
                <div className="w-8 h-8 bg-slate-700 rounded-md flex items-center justify-center">
                  <span className="text-[#3b82f6]">W</span>
                </div>
                <div className="w-8 h-8 bg-slate-700 rounded-md flex items-center justify-center">
                  <span className="text-[#3b82f6]">A</span>
                </div>
                <div className="w-8 h-8 bg-slate-700 rounded-md flex items-center justify-center">
                  <span className="text-[#3b82f6]">S</span>
                </div>
                <div className="w-8 h-8 bg-slate-700 rounded-md flex items-center justify-center">
                  <span className="text-[#3b82f6]">D</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="w-2/5 h-full p-6 space-y-6 overflow-y-auto">
          <h1 className="text-2xl font-bold text-[#3b82f6]">3D Car Driving Simulation</h1>

          {/* Dashboard */}
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 shadow-lg">
            <h2 className="text-xl font-semibold mb-4">Dashboard</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-900 rounded-lg p-3 border border-slate-700 hover:border-[#3b82f6] transition-colors">
                <div className="text-sm text-slate-400">Speed</div>
                <div className="flex items-end space-x-2">
                  <div className="text-2xl font-bold">{speed}</div>
                  <div className="text-sm text-slate-400 mb-1">km/h</div>
                </div>
                <div className="mt-2 w-full bg-slate-700 rounded-full h-2">
                  <div className="bg-[#3b82f6] h-2 rounded-full" style={{ width: `${speed}%` }}></div>
                </div>
              </div>
              <div className="bg-slate-900 rounded-lg p-3 border border-slate-700 hover:border-[#3b82f6] transition-colors">
                <div className="text-sm text-slate-400">Direction</div>
                <div className="flex items-end space-x-2">
                  <div className="text-2xl font-bold">{direction}</div>
                  <div className="text-sm text-slate-400 mb-1">{directionDegrees}°</div>
                </div>
                <div className="mt-2 flex justify-center">
                  <div className="w-6 h-6" style={{ transform: `rotate(${directionDegrees}deg)` }}>
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path
                        d="M12 5L12 19"
                        stroke="#3b82f6"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M19 12L12 5L5 12"
                        stroke="#3b82f6"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="bg-slate-900 rounded-lg p-3 border border-slate-700 hover:border-[#3b82f6] transition-colors">
                <div className="text-sm text-slate-400">Acceleration</div>
                <div className="text-2xl font-bold">{acceleration}%</div>
                <div className="mt-2 w-full bg-slate-700 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: `${acceleration}%` }}></div>
                </div>
              </div>
              <div className="bg-slate-900 rounded-lg p-3 border border-slate-700 hover:border-[#3b82f6] transition-colors">
                <div className="text-sm text-slate-400">Brake</div>
                <div className="text-2xl font-bold">{brake}%</div>
                <div className="mt-2 w-full bg-slate-700 rounded-full h-2">
                  <div className="bg-red-500 h-2 rounded-full" style={{ width: `${brake}%` }}></div>
                </div>
              </div>
            </div>
          </div>

              {/* Feed */}
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 shadow-lg">
            <details className="group">
              <summary className="flex justify-between items-center cursor-pointer list-none">
                <h2 className="text-xl font-semibold">Feed</h2>
                  <img
                  ref={videoRef}
                  src="http://localhost:5000/video_feed"
                  alt="Live Processed Video"
                  width="600"
                  height="400"
                />
              </summary>
            </details>
          </div>

          {/* Track Selection */}
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 shadow-lg">
            <h2 className="text-xl font-semibold mb-4">Track Selection</h2>
            <div className="space-y-3">
              <div
                className={`bg-slate-900 rounded-lg p-3 ${currentTrack === "city" ? "border border-[#3b82f6]" : "border border-slate-700"} flex items-center space-x-3 cursor-pointer hover:bg-slate-800 transition-colors`}
                onClick={() => handleTrackChange("city")}
                data-id="GbQ9"
              >
                <div className="w-16 h-16 bg-slate-800 rounded-md overflow-hidden">
                  <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path
                        d="M3 9L12 5L21 9L12 13L3 9Z"
                        stroke="#3b82f6"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M21 9V15"
                        stroke="#3b82f6"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M7 10.5V15.5L12 18L17 15.5V10.5"
                        stroke="#3b82f6"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="font-semibold">City Track</div>
                  <div className="text-xs text-slate-400">Urban environment with buildings and street lights</div>
                </div>
                {currentTrack === "city" && (
                  <div className="w-6 h-6 bg-[#3b82f6] rounded-full flex items-center justify-center">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path
                        d="M5 12L10 17L20 7"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                )}
              </div>

              <div
                className={`bg-slate-900 rounded-lg p-3 ${currentTrack === "mountain" ? "border border-[#3b82f6]" : "border border-slate-700"} flex items-center space-x-3 cursor-pointer hover:border-[#3b82f6] transition-colors`}
                onClick={() => handleTrackChange("mountain")}
                data-id="frdm"
              >
                <div className="w-16 h-16 bg-slate-800 rounded-md overflow-hidden">
                  <div className="w-full h-full bg-gradient-to-br from-emerald-900 to-emerald-700 flex items-center justify-center">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path
                        d="M8 3L8 17"
                        stroke="#3b82f6"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M8 3L13 8"
                        stroke="#3b82f6"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M8 3L3 8"
                        stroke="#3b82f6"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M16 7L16 21"
                        stroke="#3b82f6"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M16 21L21 16"
                        stroke="#3b82f6"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M16 21L11 16"
                        stroke="#3b82f6"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="font-semibold">Mountain Track</div>
                  <div className="text-xs text-slate-400">Winding roads with trees and elevation changes</div>
                </div>
                {currentTrack === "mountain" && (
                  <div className="w-6 h-6 bg-[#3b82f6] rounded-full flex items-center justify-center">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path
                        d="M5 12L10 17L20 7"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                )}
              </div>

              <div
                className={`bg-slate-900 rounded-lg p-3 ${currentTrack === "desert" ? "border border-[#3b82f6]" : "border border-slate-700"} flex items-center space-x-3 cursor-pointer hover:border-[#3b82f6] transition-colors`}
                onClick={() => handleTrackChange("desert")}
                data-id="-Rcf"
              >
                <div className="w-16 h-16 bg-slate-800 rounded-md overflow-hidden">
                  <div className="w-full h-full bg-gradient-to-br from-yellow-700 to-yellow-500 flex items-center justify-center">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path
                        d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
                        stroke="#3b82f6"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M12 18C15.3137 18 18 15.3137 18 12C18 8.68629 15.3137 6 12 6C8.68629 6 6 8.68629 6 12C6 15.3137 8.68629 18 12 18Z"
                        stroke="#3b82f6"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M12 14C13.1046 14 14 13.1046 14 12C14 10.8954 13.1046 10 12 10C10.8954 10 10 10.8954 10 12C10 13.1046 10.8954 14 12 14Z"
                        stroke="#3b82f6"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="font-semibold">Desert Track</div>
                  <div className="text-xs text-slate-400">Sandy terrain with cacti and sand dunes</div>
                </div>
                {currentTrack === "desert" && (
                  <div className="w-6 h-6 bg-[#3b82f6] rounded-full flex items-center justify-center">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path
                        d="M5 12L10 17L20 7"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 shadow-lg">
            <h2 className="text-xl font-semibold mb-4">Speed Control</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-slate-400">Current Speed</div>
                <div className="text-[#3b82f6] font-semibold">{speed} km/h</div>
              </div>

              <div className="w-full bg-slate-900 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 h-3 rounded-full"
                  style={{ width: `${speed}%` }}
                ></div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400">
                <div>0</div>
                <div>50</div>
                <div>100</div>
                <div>150</div>
                <div>200</div>
              </div>

              <div className="flex space-x-3">
                <button
                  className="flex-1 bg-green-600 hover:bg-green-500 text-white rounded-lg py-3 font-semibold transition-colors flex items-center justify-center space-x-2"
                  onMouseDown={() => handleAccelerateClick(true)}
                  onMouseUp={() => handleAccelerateClick(false)}
                  onMouseLeave={() => handleAccelerateClick(false)}
                  onTouchStart={() => handleAccelerateClick(true)}
                  onTouchEnd={() => handleAccelerateClick(false)}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5 12H19" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path
                      d="M12 5L19 12L12 19"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span>Accelerate</span>
                </button>
                <button
                  className="flex-1 bg-red-600 hover:bg-red-500 text-white rounded-lg py-3 font-semibold transition-colors flex items-center justify-center space-x-2"
                  onMouseDown={() => handleBrakeClick(true)}
                  onMouseUp={() => handleBrakeClick(false)}
                  onMouseLeave={() => handleBrakeClick(false)}
                  onTouchStart={() => handleBrakeClick(true)}
                  onTouchEnd={() => handleBrakeClick(false)}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18 6L6 18" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M6 6L18 18" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span>Brake</span>
                </button>
              </div>

              <div className="bg-slate-900 rounded-lg p-3 border border-slate-700">
                <div className="flex justify-between items-center">
                  <div className="text-sm text-slate-400">Boost Available</div>
                  <div className="relative w-12 h-6 bg-slate-700 rounded-full">
                    <div
                      className="absolute left-0.5 top-0.5 w-5 h-5 bg-[#3b82f6] rounded-full"
                      style={{ left: boostAvailable > 0 ? "0.5rem" : "0.125rem" }}
                    ></div>
                  </div>
                </div>
                <div className="mt-2 w-full bg-slate-700 rounded-full h-2">
                  <div className="bg-[#3b82f6] h-2 rounded-full" style={{ width: `${boostAvailable}%` }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
